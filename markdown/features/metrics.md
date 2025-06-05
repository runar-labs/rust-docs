# Runar Node Metrics System

The Metrics module provides a robust framework for collecting, managing, and exporting metrics in distributed systems. It is designed to be scalable, efficient, and interoperable with modern observability tools, supporting both standard and custom metrics with aggregation across nodes.

## Table of Contents

1. [Introduction](#introduction)
2. [Metric Types](#metric-types)
3. [Metric Registry](#metric-registry)
4. [Standard Metrics](#standard-metrics)
5. [Custom Metrics](#custom-metrics)
6. [Event-based Metrics](#event-based-metrics)
7. [Metric Collection](#metric-collection)
8. [Metric Export](#metric-export)
9. [Configuration](#configuration)
10. [Declarative Metrics](#declarative-metrics)
11. [Observability Integration](#observability-integration)
12. [Performance Considerations](#performance-considerations)
13. [Security](#security)

## Introduction

The Metrics module provides a robust framework for collecting, managing, and exporting metrics in distributed systems. It is designed to be scalable, efficient, and interoperable with modern observability tools, supporting both standard and custom metrics with aggregation across nodes.

## Metric Types

- **Counter**: Monotonically increasing (e.g., total requests)
  - Operations: increment, add

- **Gauge**: Fluctuating value (e.g., memory usage)
  - Operations: set, increment, decrement

- **Histogram**: Distribution of values (e.g., latency)
  - Operation: observe

- **Summary**: Quantiles over a window (e.g., 95th percentile)
  - Operation: observe

- **Rate**: Rate of change (e.g., requests/sec)
  - Derived from counters

- **Timer**: Duration measurement (e.g., processing time)
  - Operations: start, stop

## Metric Registry

- **Distributed Registry**: Manages metrics across nodes/services

- **Unique Identification**: Name, labels, and node/service IDs

- **Methods**:
  - Register new metrics
  - Retrieve metrics for updates or readings

## Standard Metrics

- **System Metrics**:
  - CPU usage (per core)
  - Memory usage (heap, non-heap)
  - Network I/O (bytes sent/received)
  - Disk usage (read/write operations)

- **P2P Metrics**:
  - Connection metrics
  - Network metrics
  - Gateway metrics

### P2P Metrics

**Connection Metrics**:
```rust
/// P2P connection metrics
pub struct P2PMetrics {
    // Connection counts
    active_connections: Gauge,
    total_connections: Counter,
    failed_connections: Counter,
    
    // Network metrics
    active_networks: Gauge,
    peers_per_network: Histogram,
    
    // Message metrics
    messages_sent: Counter,
    messages_received: Counter,
    message_size: Histogram,
    
    // DHT metrics
    dht_operations: Counter,
    dht_latency: Histogram,
    dht_storage_size: Gauge,
    
    // Token metrics
    token_validations: Counter,
    token_validation_failures: Counter,
}

impl P2PMetrics {
    pub fn record_connection(&self, success: bool) {
        self.total_connections.inc();
        if success {
            self.active_connections.inc();
        } else {
            self.failed_connections.inc();
        }
    }
    
    pub fn record_message(&self, size: usize, is_outbound: bool) {
        self.message_size.observe(size as f64);
        if is_outbound {
            self.messages_sent.inc();
        } else {
            self.messages_received.inc();
        }
    }
    
    pub fn record_dht_operation(&self, op_type: &str, duration: Duration) {
        self.dht_operations.inc_by(1, &[("type", op_type)]);
        self.dht_latency.observe(duration.as_secs_f64());
    }
}
```

**Network Metrics**:
```rust
/// Network-specific metrics
pub struct NetworkMetrics {
    // Peer metrics
    active_peers: Gauge,
    peer_message_rates: Histogram,
    peer_latencies: Histogram,
    
    // Bandwidth metrics
    bytes_sent: Counter,
    bytes_received: Counter,
    bandwidth_usage: Histogram,
    
    // Discovery metrics
    discovery_attempts: Counter,
    discovery_successes: Counter,
    discovery_time: Histogram,
}

impl NetworkMetrics {
    pub fn record_peer_message(&self, peer_id: &PeerId, size: usize, duration: Duration) {
        self.peer_message_rates.observe(1.0);
        self.peer_latencies.observe(duration.as_secs_f64());
        self.bytes_sent.inc_by(size as u64);
    }
    
    pub fn record_discovery(&self, success: bool, duration: Duration) {
        self.discovery_attempts.inc();
        if success {
            self.discovery_successes.inc();
            self.discovery_time.observe(duration.as_secs_f64());
        }
    }
}
```

### Gateway Metrics

- **Distributed Metrics**:
  - Total active connections
  - Aggregated request and error rates

## Custom Metrics

- **Label Support**: Enhanced with cardinality limits
- **Metadata**: Descriptions and units

## Event-based Metrics

- **Distributed Event Tracking**: Aggregate events across services
- **Event Latency**: Time from emission to processing

## Metric Collection

- **Efficient Collection**:
  - Lock-free structures
  - Batch updates

- **Sampling**:
  - Configurable rates
  - Adaptive sampling

- **Aggregation**:
  - Sum, average, percentiles across nodes

## Metric Export

- **Formats**:
  - OpenMetrics
  - JSON, Protobuf

- **Protocols**:
  - HTTP/HTTPS (pull)
  - gRPC (push)
  - UDP (StatsD)

- **Distributed Export**:
  - Independent node export
  - Central aggregator option

## Configuration

- **Global**:
  - Enable/disable metrics
  - Default sampling rates

- **Per-Metric**:
  - Enable/disable specific metrics
  - Labels and aggregation rules

- **Export**:
  - Exporter type
  - Intervals, batch sizes, security settings

## Declarative Metrics

The metrics system supports a declarative approach using macros to reduce boilerplate code. This makes it easy to add metrics to services, actions, and events without manually creating and managing metric instances.

> **Implementation Note**: Runar macros work with both compile-time (using distributed slices) and runtime registration approaches. This means metrics can be easily applied in both production and testing environments without requiring unstable Rust features.

### Service-Level Metrics

Apply metrics to an entire service using the `#[metrics]` macro:

```rust
use runar_node::prelude::*;

// Define service with automatic metrics collection
#[runar_macros::service]
#[metrics]
struct UserService {
    #[inject]
    db_connection: DatabaseConnection,
}
```

This macro automatically creates and registers the following metrics for the service:
- Request counter (`service_requests_total`)
- Active requests gauge (`service_active_requests`)
- Error counter (`service_errors_total`)
- Response time histogram (`service_response_time_seconds`)

All metrics are labeled with the service name for easy filtering and aggregation.

### Action-Level Metrics

Apply metrics to specific actions using the `#[metered]` attribute or combined with the `#[action]` macro:

```rust
impl UserService {
    // Add metrics to this action using the dedicated metered macro
    #[action]
    #[metered]
    async fn get_user(&self, context: &RequestContext, id: u64) -> Result<User> {
        // Implementation...
        let user = self.db_connection.query_one("SELECT * FROM users WHERE id = ?", &[id]).await?;
        Ok(user)
    }
    
    // Alternative syntax with action attributes
    #[action(metrics = true)]
    async fn update_user(&self, context: &RequestContext, id: u64, data: UserData) -> Result<User> {
        // Implementation...
        Ok(user)
    }
    
    // With custom metric configuration
    #[action]
    #[metered(
        histogram_buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0],
        labels = ["priority", "user_type"]
    )]
    async fn process_complex_operation(&self, context: &RequestContext, data: ComplexData) -> Result<OperationResult> {
        // Implementation...
        Ok(result)
    }
}
```

The `#[metered]` macro automatically wraps the action with metric collection:
1. Increments a request counter specific to the action
2. Records the duration of the action
3. Tracks successes and failures
4. Adds context-aware labels if specified

### Event-Based Metrics

Automatically track metrics for events:

```rust
#[event_handler]
#[metered(event = "user.updated")]
async fn handle_user_updated(&self, context: &EventContext, event: UserUpdatedEvent) -> Result<()> {
    // Event handling...
    Ok(())
}
```

This creates:
1. Event counter (`event_received_total{event="user.updated"}`)
2. Event processing time histogram (`event_processing_time_seconds{event="user.updated"}`)
3. Event failure counter (`event_failures_total{event="user.updated"}`)

### Custom Metric Definitions

Define custom metrics with the `#[metric]` macro:

```rust
#[metric(
    type = "counter",
    name = "user_registration_total",
    description = "Total number of user registrations",
    labels = ["source", "account_type"]
)]
struct UserRegistrationMetric;

impl UserService {
    #[action]
    async fn register_user(&self, context: &RequestContext, user_data: UserRegistrationData) -> Result<User> {
        // Implementation...
        
        // Increment the custom metric with labels
        metrics::increment!("user_registration_total", labels: {
            "source" => user_data.source,
            "account_type" => user_data.account_type
        });
        
        Ok(user)
    }
}
```

### Macro-Based Helper Functions

The macros also provide convenient helper functions for common metric operations:

```rust
// Increment a counter
metrics::increment!("custom_counter");

// Increment with a specific value
metrics::increment!("custom_counter", value: 5);

// Increment with labels
metrics::increment!("custom_counter", labels: {"label1" => "value1"});

// Observe a value on a histogram
metrics::observe!("response_time", value: duration);

// Set a gauge
metrics::set!("active_connections", value: count);

// Start a timer and automatically record when dropped
let _timer = metrics::timer!("operation_duration");
```

### Automatic Metrics Collection

All metrics are automatically registered with the metric registry and included in exports. This removes the need to manually create, register, and update metric instances.

### Comprehensive Service Example

Here's a complete example demonstrating how to use metric macros in a real-world service:

```rust
use runar_node::prelude::*;

// Define a service with automatic metrics
#[runar_macros::service]
#[metrics(prefix = "api_gateway_")]  // Optional prefix for all metrics
struct ApiGatewayService {
    #[inject]
    db: Database,
    
    #[inject]
    cache_manager: CacheManager,
    
    // Custom metrics can still be defined manually when needed
    #[metric_field]
    cache_hit_ratio: Gauge,
    
    #[metric_field]
    request_size: Histogram,
}

impl ApiGatewayService {
    // Constructor to set up any custom metrics not handled by macros
    fn new() -> Self {
        // The #[metrics] macro will automatically set up common metrics,
        // but we can still manually define specialized ones
        let cache_hit_ratio = Gauge::new(
            "api_gateway_cache_hit_ratio",
            "Ratio of cache hits to total requests"
        ).register();
        
        let request_size = Histogram::new(
            "api_gateway_request_size_bytes",
            "Size of API requests in bytes"
        )
        .with_buckets(vec![64.0, 256.0, 1024.0, 4096.0, 16384.0, 65536.0])
        .register();
        
        Self {
            db: Database::default(),
            cache_manager: CacheManager::default(),
            cache_hit_ratio,
            request_size,
        }
    }

    // Standard action with default metrics
    #[action]
    #[metered]
    async fn get_user(&self, context: &RequestContext, id: String) -> Result<User> {
        // Implementation...
        let user = self.db.find_user(&id).await?;
        Ok(user)
    }
    
    // Action with both caching and metrics
    #[action(cache(enabled = true, ttl = 60))]
    #[metered(
        buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],  // Custom time buckets
        labels = ["user_tier"]                           // Custom labels
    )]
    async fn get_user_profile(&self, context: &RequestContext, id: String) -> Result<UserProfile> {
        // Implementation...
        // The caching layer handles cache hits automatically
        // The metrics layer tracks execution time and counts
        
        // Add the user_tier label value from context
        metrics::add_label!("user_tier", context.user_tier().unwrap_or("free"));
        
        let profile = self.db.find_user_profile(&id).await?;
        Ok(profile)
    }
    
    // Action with custom metric tracking
    #[action]
    async fn process_order(&self, context: &RequestContext, order: Order) -> Result<OrderConfirmation> {
        // Start a timer for this specific operation
        let timer = metrics::timer!("order_processing_time", labels: {
            "order_type" => order.type_name(),
            "priority" => order.priority().to_string()
        });
        
        // Record the order amount
        metrics::observe!("order_amount", value: order.total_amount(), labels: {
            "currency" => order.currency()
        });
        
        // Process the order
        let result = process_order_internal(&order).await;
        
        // Track success/failure
        if result.is_ok() {
            metrics::increment!("orders_processed");
        } else {
            metrics::increment!("orders_failed");
        }
        
        // Timer automatically stops when dropped
        drop(timer);
        
        result
    }
    
    // Event handler with metrics
    #[event_handler("payment.completed")]
    #[metered(event = "payment.completed")]
    async fn handle_payment_completed(&self, context: &EventContext, event: PaymentCompletedEvent) -> Result<()> {
        // Implementation...
        
        // Track payment amount
        metrics::observe!("payment_amount", value: event.amount, labels: {
            "payment_method" => event.payment_method,
            "currency" => event.currency
        });
        
        // Event processing...
        Ok(())
    }
    
    // Background job with metrics
    #[job(schedule = "*/5 * * * *")]  // Run every 5 minutes
    #[metered(name = "cleanup_job")]  // Custom metric name
    async fn cleanup_expired_sessions(&self, context: &JobContext) -> Result<CleanupReport> {
        let start_time = Instant::now();
        
        // Implementation...
        let expired_count = cleanup_sessions().await?;
        
        // Record custom metrics about the cleanup
        metrics::set!("expired_sessions_count", value: expired_count as f64);
        
        // Duration is automatically recorded by the metered macro
        Ok(CleanupReport { removed_count: expired_count })
    }
}

// Event publisher with automatic metrics
#[publisher]
#[metrics(events = true)]  // Track metrics for all published events
struct EventPublisher {
    #[inject]
    event_bus: EventBus,
}

impl EventPublisher {
    #[action]
    async fn publish_user_event(&self, context: &RequestContext, event: UserEvent) -> Result<()> {
        // The metrics macro automatically tracks:
        // - Number of events published
        // - Publication latency
        // - Success/failure rates
        self.event_bus.publish("user", event).await
    }
}
```

This example demonstrates how to:
1. Apply metrics to an entire service
2. Add automatic metrics to individual actions
3. Combine metrics with other features like caching
4. Use custom metric configuration
5. Add metrics to event handlers and background jobs
6. Use the helper functions for manual metric tracking when needed

### P2P and DHT Metric Integration

The metrics system seamlessly integrates with P2P networking and DHT operations through macros, enabling automatic collection of performance and operational data without manual tracking code.

#### Automatic P2P Metrics

Apply metrics to P2P transport operations:

```rust
use runar_node::p2p::prelude::*;

// P2P service with automatic metrics
#[p2p_service]
#[metrics(prefix = "p2p_")]
struct P2PService {
    #[inject]
    transport: P2PTransport,
    
    #[inject]
    dht: DHTService,
}

impl P2PService {
    // DHT operation with automatic metrics
    #[dht_operation]
    #[metered(
        prefix = "dht_",
        buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
    )]
    async fn store_value(&self, context: &RequestContext, key: String, value: Vec<u8>) -> Result<()> {
        // Network ID is automatically retrieved from context
        let network_id = context.network_id();
        
        // Store the value in DHT
        self.dht.put(network_id, key, value).await
    }
    
    // Peer discovery with metrics
    #[action]
    #[metered(name = "peer_discovery")]
    async fn discover_peers(&self, context: &RequestContext, network_id: String) -> Result<Vec<PeerInfo>> {
        let start = Instant::now();
        
        // Discover peers
        let peers = self.transport.discover_peers(network_id).await?;
        
        // Record peer count
        metrics::set!("discovered_peers_count", value: peers.len() as f64, labels: {
            "network" => network_id
        });
        
        Ok(peers)
    }
    
    // Message broadcasting with metrics
    #[action]
    #[metered(name = "broadcast")]
    async fn broadcast_message(&self, context: &RequestContext, network_id: String, message: Message) -> Result<BroadcastStats> {
        // Implementation...
        
        // Record message size
        metrics::observe!("message_size_bytes", value: message.size() as f64);
        
        // Broadcast is automatically metered
        let stats = self.transport.broadcast(network_id, message).await?;
        
        // Record delivery stats
        metrics::set!("message_delivery_ratio", value: stats.successful_deliveries as f64 / stats.total_targets as f64);
        
        Ok(stats)
    }
}
```

#### DHT Service with Metrics

Define a DHT service with comprehensive metrics:

```rust
use runar_node::dht::prelude::*;

#[dht_service]
#[metrics]
struct DHTService {
    #[inject]
    storage: DHTStorage,
    
    #[metric_field]
    storage_size: Gauge,
    
    #[metric_field]
    replication_factor: Gauge,
}

impl DHTService {
    // Get operation with metrics
    #[action]
    #[metered(name = "dht_get")]
    async fn get_value(&self, context: &RequestContext, key: String) -> Result<Option<Vec<u8>>> {
        // Network ID from context
        let network_id = context.network_id();
        
        // Record DHT operation
        let _operation = metrics::timer!("dht_operation", labels: {
            "operation" => "get",
            "network" => network_id
        });
        
        // Implementation...
        let result = self.storage.get(network_id, key.clone()).await?;
        
        // Record hit/miss
        if result.is_some() {
            metrics::increment!("dht_hits", labels: {"network" => network_id});
        } else {
            metrics::increment!("dht_misses", labels: {"network" => network_id});
        }
        
        Ok(result)
    }
    
    // Put operation with metrics
    #[action]
    #[metered(name = "dht_put")]
    async fn put_value(&self, context: &RequestContext, key: String, value: Vec<u8>, ttl: Option<Duration>) -> Result<()> {
        let network_id = context.network_id();
        
        // Record value size
        metrics::observe!("dht_value_size_bytes", value: value.len() as f64, labels: {
            "network" => network_id
        });
        
        // Implementation...
        self.storage.put(network_id, key, value, ttl).await?;
        
        // Update storage size metric
        self.update_storage_metrics(network_id).await;
        
        Ok(())
    }
    
    // Internal method to update storage metrics
    async fn update_storage_metrics(&self, network_id: &str) {
        if let Ok(stats) = self.storage.get_statistics(network_id).await {
            self.storage_size.set(stats.size_bytes as f64, &[("network", network_id)]);
            self.replication_factor.set(stats.replication_factor as f64, &[("network", network_id)]);
        }
    }
}
```

#### Network Metrics Dashboard

The declarative metrics approach makes it easy to create comprehensive dashboards for P2P and DHT operations, including:

- Network health (connections, latency, message delivery)
- DHT performance (gets, puts, hit ratio)
- Storage utilization (size, distribution)
- Peer statistics (count, churn rate)

The collected metrics can be exported to monitoring systems like Prometheus and visualized in Grafana or other dashboarding tools without requiring custom integration code.

## Observability Integration

- **OpenTelemetry**: Export compatibility
- **Tracing**: Link with distributed traces

## Performance Considerations

- **Low Overhead**:
  - Efficient data structures
  - Minimal synchronization

- **Cardinality Management**:
  - Limit label combinations
  - Monitor high-cardinality metrics

## Security

- **Secure Export**:
  - TLS/SSL
  - Authentication (API keys, tokens)

- **Data Privacy**:
  - Exclude sensitive data

## Implementation Example

```rust
use runar_node::metrics::prelude::*;

// Create a simple counter
let requests_counter = Counter::new("http_requests_total", "Total HTTP requests")
    .with_label("service", "api_gateway")
    .register();

// Increment the counter
requests_counter.increment();

// Create a histogram for response time
let response_time = Histogram::new(
    "http_response_time_seconds", 
    "HTTP response time in seconds"
)
    .with_buckets(vec![0.01, 0.05, 0.1, 0.5, 1.0, 5.0])
    .register();

// Observe a value
response_time.observe(0.42);

// Create a gauge for concurrent connections
let connections = Gauge::new(
    "active_connections",
    "Number of active connections"
)
    .register();

// Set the gauge value
connections.set(42.0);

// Create a timer for measuring operation duration
let operation_timer = Timer::new(
    "operation_duration_seconds",
    "Time to complete operation"
)
    .register();

// Use the timer
let timer_handle = operation_timer.start();
// ... perform operation ...
timer_handle.stop(); // Automatically records the duration

// Export metrics
MetricsExporter::new()
    .format(ExportFormat::OpenMetrics)
    .protocol(ExportProtocol::Http)
    .interval(Duration::from_secs(15))
    .start();
```

## Service Integration Example

```rust
use runar_node::prelude::*;
use runar_node::metrics::prelude::*;

struct MyService {
    name: String,
    path: String,
    // Service fields...
    request_counter: Counter,
    active_requests: Gauge,
    response_time: Histogram,
}

impl MyService {
    fn new(name: &str) -> Self {
        // Create metrics
        let request_counter = Counter::new("service_requests_total", "Total service requests")
            .with_label("service", name)
            .register();
            
        let active_requests = Gauge::new("service_active_requests", "Active service requests")
            .with_label("service", name)
            .register();
            
        let response_time = Histogram::new("service_response_time_seconds", "Service response time")
            .with_label("service", name)
            .with_buckets(vec![0.01, 0.05, 0.1, 0.5, 1.0])
            .register();
            
        Self {
            name: name.to_string(),
            path: name.to_string(),
            // Initialize other fields...
            request_counter,
            active_requests,
            response_time,
        }
    }
    
    async fn handle_request(&self, request: &ServiceRequest) -> Result<ServiceResponse> {
        // Increment request counter
        self.request_counter.increment();
        
        // Increment active requests
        self.active_requests.increment();
        
        // Create timer for response time
        let timer = self.response_time.start_timer();
        
        // Process the request
        let result = self.process_request_internal(request).await;
        
        // Stop timer
        timer.stop();
        
        // Decrement active requests
        self.active_requests.decrement();
        
        result
    }
    
    async fn process_request_internal(&self, request: &ServiceRequest) -> Result<ServiceResponse> {
        // Actual request processing logic...
        // ...
        
        Ok(ServiceResponse {
            status: ResponseStatus::Success,
            message: "Request processed".to_string(),
            data: None,
        })
    }
}

#[async_trait]
impl AbstractService for MyService {
    // AbstractService implementation...
    
    async fn process_request(&self, request: ServiceRequest) -> Result<ServiceResponse> {
        self.handle_request(&request).await
    }
}
```

## Integration

### P2P Integration

The metrics system integrates with the P2P transport layer to collect:
- Connection statistics
- Message flow metrics
- DHT operation metrics
- Network-specific metrics

**Example Integration**:
```rust
impl P2PTransport {
    async fn handle_message(&self, message: Message) -> Result<(), Error> {
        let start = Instant::now();
        let result = self.process_message(message).await;
        let duration = start.elapsed();
        
        // Record metrics
        self.metrics.record_p2p_message(
            &message.network_id,
            &message.peer_id,
            message.size(),
            duration
        );
        
        result
    }
}
```


## Examples

This section will be expanded with practical examples.
