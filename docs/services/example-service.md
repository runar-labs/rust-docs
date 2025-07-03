# Example Service Implementation

This document provides a complete example of a service implementation in the Runar node system, demonstrating both request-response and publish-subscribe patterns.


## Table of Contents

- [Introduction](#introduction)
- [Service Implementation with Macros](#service-implementation-with-macros)
- [Using Services](#using-services)
- [Examples](#examples)

## Introduction

This document demonstrates how to implement services using the Runar service macros. The examples show both traditional manual implementations and the preferred macro approach.

## Service Implementation with Macros

Below is an example of a `DataService` that manages data records, with operations to create, retrieve, update, and delete records, as well as publish events when records change. This example uses the service macros for a cleaner implementation.

```rust
use anyhow::{anyhow, Result};
use chrono::Utc;
use runar_node::services::RequestContext;
use runar_common::types::ArcValue;
use runar_node::vmap;
use runar_macros::{service, action, subscribe};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

/// A data record with serialization support
#[derive(Clone, Debug, Serialize, Deserialize)]
struct DataRecord {
    id: String,
    name: String,
    value: String,
    created_at: String,
    updated_at: String,
}

impl DataRecord {
    fn new(name: &str, value: &str) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            value: value.to_string(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    fn update(&mut self, value: &str) {
        self.value = value.to_string();
        self.updated_at = Utc::now().to_rfc3339();
    }

    // Convert to ArcValue for event publishing
    fn to_arc_value(&self) -> ArcValue {
        ArcValue::from_struct(self.clone())
    }
}

impl From<DataRecord> for ArcValue {
    fn from(record: DataRecord) -> Self {
        ArcValue::from_struct(record)
    }
}

/// DataService manages a collection of data records
#[service(
    name = "data",
    path = "data_service",
    description = "Service for managing data records",
    version = "1.0.0"
)]
struct DataService {
    records: Arc<Mutex<HashMap<String, DataRecord>>>,
}

#[service_impl]
impl DataService {
    pub fn new() -> Self {
        DataService {
            records: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    // CRUD Operations using action macros
    
    // Create a new record - returns String (the record ID)
    #[action(name = "create")]
    async fn create_record(&self, context: &RequestContext, name: &str, value: &str) -> Result<String> {
        let record = DataRecord::new(name, value);
        let record_id = record.id.clone();
        
        // Store the record
        {
            let mut records = self.records.lock().await;
            records.insert(record.id.clone(), record.clone());
        }
        
        // Publish event that a record was created
        context.publish(
            &format!("{}/created", context.service_path()),
            ArcValue::from_struct(record.clone())
        ).await?;
        
        // Return just the record ID directly
        Ok(record_id)
    }
    
    // Get a record by ID - returns the DataRecord directly
    #[action(name = "get")]
    async fn get_record(&self, _context: &RequestContext, id: &str) -> Result<DataRecord> {
        let records = self.records.lock().await;
        
        if let Some(record) = records.get(id) {
            Ok(record.clone())
        } else {
            Err(anyhow!("Record with ID {} not found", id))
        }
    }
    
    // Update a record - returns the updated DataRecord
    #[action(name = "update")]
    async fn update_record(&self, context: &RequestContext, id: &str, value: &str) -> Result<DataRecord> {
        let mut updated_record: Option<DataRecord> = None;
        
        // Update the record
        {
            let mut records = self.records.lock().await;
            
            if let Some(record) = records.get_mut(id) {
                record.update(value);
                updated_record = Some(record.clone());
            }
        }
        
        // Check if record was found and updated
        if let Some(record) = updated_record {
            // Publish event that a record was updated
            context.publish(
                &format!("{}/updated", context.service_path()),
                ArcValue::from_struct(record.clone())
            ).await?;
            
            Ok(record)
        } else {
            Err(anyhow!("Record with ID {} not found", id))
        }
    }
    
    // Delete a record - returns a boolean indicating success
    #[action(name = "delete")]
    async fn delete_record(&self, context: &RequestContext, id: &str) -> Result<bool> {
        let deleted_record: Option<DataRecord>;
        
        // Delete the record
        {
            let mut records = self.records.lock().await;
            deleted_record = records.remove(id);
        }
        
        // Check if record was found and deleted
        if let Some(record) = deleted_record {
            // Publish event that a record was deleted
            context.publish(
                &format!("{}/deleted", context.service_path()),
                ArcValue::from_struct(record.clone())
            ).await?;
            
            Ok(true)
        } else {
            Err(anyhow!("Record with ID {} not found", id))
        }
    }
    
    // List all records - returns a Vec of DataRecord
    #[action(name = "list")]
    async fn list_records(&self, _context: &RequestContext) -> Result<Vec<DataRecord>> {
        let records = self.records.lock().await;
        let records_vec = records.values().cloned().collect();
        Ok(records_vec)
    }
    
    // Count records - returns a simple u32
    #[action(name = "count")]
    async fn count_records(&self, _context: &RequestContext) -> Result<u32> {
        let records = self.records.lock().await;
        Ok(records.len() as u32)
    }
}

/// Service for monitoring data events
#[service(
    name = "monitor",
    path = "data_monitor",
    description = "Service for monitoring data events"
)]
struct DataMonitorService {
    // Statistics counters
    stats: Arc<Mutex<HashMap<String, usize>>>,
}

#[service_impl]
impl DataMonitorService {
    pub fn new() -> Self {
        let mut stats = HashMap::new();
        
        // Initialize counters
        stats.insert("created".to_string(), 0);
        stats.insert("updated".to_string(), 0);
        stats.insert("deleted".to_string(), 0);
        stats.insert("total".to_string(), 0);
        
        DataMonitorService {
            stats: Arc::new(Mutex::new(stats)),
        }
    }
    
    // Get all statistics - returns a HashMap directly
    #[action(name = "get_stats")]
    async fn get_stats(&self, _context: &RequestContext) -> Result<HashMap<String, usize>> {
        let stats = self.stats.lock().await;
        // Return a clone of the stats directly
        Ok(stats.clone())
    }
    
    // Event handlers for the various data events
    #[subscribe(topic = "data_service/created")]
    async fn on_record_created(&mut self, payload: ArcValue) -> Result<()> {
        // Extract the record from the payload
        let record: DataRecord = payload.as_type()?;
        
        // Update the statistics
        let mut stats = self.stats.lock().await;
        *stats.entry("created".to_string()).or_insert(0) += 1;
        *stats.entry("total".to_string()).or_insert(0) += 1;
        
        println!("Record created: {}", record.id);
        Ok(())
    }
    
    #[subscribe(topic = "data_service/updated")]
    async fn on_record_updated(&mut self, payload: ArcValue) -> Result<()> {
        // Extract the record from the payload
        let record: DataRecord = payload.as_type()?;
        
        // Update the statistics
        let mut stats = self.stats.lock().await;
        *stats.entry("updated".to_string()).or_insert(0) += 1;
        
        println!("Record updated: {}", record.id);
        Ok(())
    }
    
    #[subscribe(topic = "data_service/deleted")]
    async fn on_record_deleted(&mut self, payload: ArcValue) -> Result<()> {
        // Extract the record from the payload
        let record: DataRecord = payload.as_type()?;
        
        // Update the statistics
        let mut stats = self.stats.lock().await;
        *stats.entry("deleted".to_string()).or_insert(0) += 1;
        *stats.entry("total".to_string()).or_insert(0) -= 1;
        
        println!("Record deleted: {}", record.id);
        Ok(())
    }
}

// Required for subscription handlers
impl Clone for DataMonitorService {
    fn clone(&self) -> Self {
        Self {
            stats: self.stats.clone(),
        }
    }
}

## Using Services

Here's an example of how to use these services in a Runar node, demonstrating both direct parameter passing and map-based parameters:

```rust
use anyhow::Result;
use runar_node::node::{Node, NodeConfig};
use runar_node::vmap;
use tokio;

#[tokio::main]
async fn main() -> Result<()> {
    // Create and configure the node
    let config = NodeConfig::new(
        "my_node",
        "./data",
        "./data/db",
    );
    let mut node = Node::new(config).await?;
    
    // Initialize the node
    node.init().await?;
    
    // Create and add the services
    let data_service = DataService::new();
    let monitor_service = DataMonitorService::new();
    
    node.add_service(data_service).await?;
    node.add_service(monitor_service).await?;
    node.start().await?;
    
    // Create a new data record using map-based parameters
    let create_result = node.request(
        "data_service/create",
        vmap! {
            "name" => "test_record",
            "value" => "initial value"
        },
    ).await?;
    
    // The action returns a String directly
    let record_id: String = create_result;
    println!("Created record with ID: {}", record_id);
    
    // Update the record using map-based parameters
    let updated_record = node.request(
        "data_service/update",
        vmap! {
            "id" => record_id.clone(),
            "value" => "updated value"
        },
    ).await?;
    
    println!("Updated record: {:?}", updated_record);
    
    // Count records - direct value extraction
    let record_count: u32 = node.request("data_service/count", None).await?;
    println!("Current record count: {}", record_count);
    
    // Get a record using direct parameter passing
    // For actions with a single parameter, you can pass the value directly
    let get_result = node.request(
        "data_service/get",
        record_id.clone(), // Direct string parameter without vmap!
    ).await?;
    
    // The action returns a DataRecord directly
    let record: DataRecord = get_result;
    println!("Retrieved record - Name: {}, Value: {}", record.name, record.value);
    
    // Wait a bit for events to be processed
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    
    // Get statistics from the monitor service
    let stats_result = node.request(
        "data_monitor/get_stats",
        vmap! {}, // Empty map for no parameters
    ).await?;
    
    // The action returns a HashMap directly
    let stats: HashMap<String, u32> = stats_result;
    println!("Current stats: {:?}", stats);
    
    // Delete the record - this action takes a single string parameter
    let delete_result = node.request(
        "data_service/delete",
        record_id, // Direct parameter without vmap!
    ).await?;
    
    // The action returns a boolean directly  
    let delete_success: bool = delete_result;
    println!("Delete successful: {}", delete_success);
    
    // Wait for events to be processed
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    
    // Get final statistics
    let final_stats = node.request(
        "data_monitor/get_stats",
        vmap! {},
    ).await?;
    
    let final_stats: HashMap<String, u32> = final_stats;
    println!("Final stats: {:?}", final_stats);
    
    // Gracefully shut down the node
    node.stop().await?;
    
    Ok(())
}

## Examples

### Key Differences with the Macro Approach

1. **Direct Return Types**: Action methods return their actual data types (`String`, `DataRecord`, `u32`, etc.) instead of `ServiceResponse`.

2. **Simplified Parameter Extraction**: The `vmap!` and specialized type macros are used for clean parameter extraction with defaults:
   ```rust
   // Instead of chained unwraps:
   let record_id = create_result
       .data
       .and_then(|data| data.get("id"))
       .and_then(|id| id.as_str().map(|s| s.to_string()))
       .expect("Failed to get record ID");
       
   // With direct return types:
   let record_id: String = create_result;
   ```

3. **Direct Parameter Passing**: For actions with a single parameter, you can pass the value directly:
   ```rust
   // Instead of:
   node.request("data_service/get", vmap! { "id" => record_id })
   
   // You can use:
   node.request("data_service/get", record_id)
   ```

4. **Clean Event Subscriptions**: The `#[subscribe]` macro automatically sets up event subscriptions.

5. **Automatic Error Handling**: Error responses are automatically generated from the `Result<T>` return type.

### Benefits of the Macro Approach

- **Less Boilerplate**: No need to manually implement the `AbstractService` trait
- **Type Safety**: Action return types are preserved and automatically converted
- **Cleaner API**: Fewer lines of code for common operations
- **Better Error Handling**: Errors are propagated naturally through Rust's Result type
- **Consistent Events**: Event publishing and subscription follow a standard pattern

