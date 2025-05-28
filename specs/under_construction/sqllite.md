
# SQLite Mixin Service Implementation

## Overview

This document describes the implementation of SQLite services in the Runar framework, providing a type-safe interface for database operations.

## Stateless vs. Stateful Services

The framework distinguishes between stateless and stateful services:

- **Stateless Services**: Most services should be stateless, where nothing is stored in the service instance. Action handlers and event handlers just deal with the data received as parameters or in the context and return results or call other actions or emit events.

- **Stateful Services**: These services store data and allow retrieval. Examples include SQLite service or MongoDB service. Stateful services might need to complete data synchronization before they are available to answer requests and handle events.

**Important Note**: Only services that have STARTED can receive events and accept requests. Stateful services will check for full data sync during start, and only when that is done will they complete the start method. Then the core can set the service state to started, making it available for requests and event processing.

## Core Types

```rust
// Core value types
#[derive(Debug, Clone)]
pub enum Value {
    Null,
    Integer(i64),
    Real(f64),
    Text(String),
    Blob(Vec<u8>),
    Boolean(bool),
}

// Parameter bindings
#[derive(Debug, Default)]
pub struct Params {
    values: HashMap<String, Value>,
}

impl Params {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_value(mut self, name: &str, value: impl Into<Value>) -> Self {
        self.values.insert(name.to_string(), value.into());
        self
    }
}

// SQL Query
#[derive(Debug)]
pub struct SqlQuery {
    pub statement: String,
    pub params: Params,
}

impl SqlQuery {
    pub fn new(statement: &str) -> Self {
        Self {
            statement: statement.to_string(),
            params: Params::new(),
        }
    }


    pub fn with_params(mut self, params: Params) -> Self {
        self.params = params;
        self
    }
}

// Query Operators
#[derive(Debug)]
pub enum QueryOperator {
    Equal(Value),
    NotEqual(Value),
    GreaterThan(Value),
    GreaterThanOrEqual(Value),
    LessThan(Value),
    LessThanOrEqual(Value),
    Like(String),
    In(Vec<Value>),
}

// Query Builder
#[derive(Debug, Default)]
pub struct Query {
    conditions: HashMap<String, QueryOperator>,
}

impl Query {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_condition(mut self, field: &str, op: QueryOperator) -> Self {
        self.conditions.insert(field.to_string(), op);
        self
    }
}

// CRUD Operations
#[derive(Debug)]
pub struct CreateOperation {
    pub table: String,
    pub data: HashMap<String, Value>,
}

#[derive(Debug)]
pub struct ReadOperation {
    pub table: String,
    pub query: Query,
    pub fields: Option<Vec<String>>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub order_by: Option<Vec<(String, bool)>>, // (field, is_ascending)
}

#[derive(Debug)]
pub struct UpdateOperation {
    pub table: String,
    pub query: Query,
    pub updates: HashMap<String, Value>,
}

#[derive(Debug)]
pub struct DeleteOperation {
    pub table: String,
    pub query: Query,
}

#[derive(Debug)]
pub enum CrudOperation {
    Create(CreateOperation),
    Read(ReadOperation),
    Update(UpdateOperation),
    Delete(DeleteOperation),
}

// Schema Definition
#[derive(Debug)]
pub struct Schema {
    pub tables: Vec<TableDefinition>,
}

#[derive(Debug)]
pub struct TableDefinition {
    pub name: String,
    pub columns: Vec<ColumnDefinition>,
    pub primary_key: Vec<String>,
    pub foreign_keys: Vec<ForeignKey>,
    pub indexes: Vec<IndexDefinition>,
}

#[derive(Debug)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: DataType,
    pub constraints: Vec<ColumnConstraint>,
    pub default_value: Option<DefaultValue>,
}

#[derive(Debug)]
pub enum DataType {
    Integer,
    Text,
    Real,
    Blob,
}

#[derive(Debug)]
pub enum ColumnConstraint {
    PrimaryKey,
    NotNull,
    Unique,
}

#[derive(Debug)]
pub enum DefaultValue {
    Integer(i64),
    Text(String),
    Real(f64),
    Null,
    CurrentTimestamp,
}

#[derive(Debug)]
pub struct ForeignKey {
    pub column: String,
    pub foreign_table: String,
    pub foreign_column: String,
    pub on_delete: ForeignKeyAction,
    pub on_update: ForeignKeyAction,
}

#[derive(Debug)]
pub enum ForeignKeyAction {
    NoAction,
    Restrict,
    Cascade,
    SetNull,
    SetDefault,
}

#[derive(Debug)]
pub struct IndexDefinition {
    pub name: String,
    pub columns: Vec<String>,
    pub unique: bool,
}

// Builder pattern implementations
impl Schema {
    pub fn new() -> Self {
        Schema { tables: Vec::new() }
    }

    pub fn add_table(mut self, table: TableDefinition) -> Self {
        self.tables.push(table);
        self
    }
}
```

## Usage Example

```rust
use runar_node::{Node, NodeConfig};
use runar_services::mixins::MixInService;
use runar_services::sqlite::{
    Schema, TableDefinition, ColumnDefinition, DataType, ColumnConstraint,
    SqliteService, SqliteCrud, SqliteConfig, Value, Query, QueryOperator
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Create a node
    let node_config = NodeConfig::new("test");
    let mut node = Node::new(node_config).await?;

    // Define schema for users and profiles tables
    let schema = Schema::new()
        .add_table(TableDefinition {
            name: "users".to_string(),
            columns: vec![
                ColumnDefinition {
                    name: "id".to_string(),
                    data_type: DataType::Integer,
                    constraints: vec![ColumnConstraint::PrimaryKey],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "name".to_string(),
                    data_type: DataType::Text,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "email".to_string(),
                    data_type: DataType::Text,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "age".to_string(),
                    data_type: DataType::Integer,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
            ],
            primary_key: vec!["id".to_string()],
            foreign_keys: Vec::new(),
            indexes: Vec::new(),
        })
        .add_table(TableDefinition {
            name: "profiles".to_string(),
            columns: vec![
                ColumnDefinition {
                    name: "id".to_string(),
                    data_type: DataType::Integer,
                    constraints: vec![ColumnConstraint::PrimaryKey],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "user_id".to_string(),
                    data_type: DataType::Integer,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "bio".to_string(),
                    data_type: DataType::Text,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
                ColumnDefinition {
                    name: "avatar".to_string(),
                    data_type: DataType::Text,
                    constraints: vec![ColumnConstraint::NotNull],
                    default_value: None,
                },
            ],
            primary_key: vec!["id".to_string()],
            foreign_keys: Vec::new(),
            indexes: Vec::new(),
        });
     
    // Configure SQLite
    let sqlite_config = SqliteConfig::new("./data/users.db", schema);
    
    // Create SQLite service with schema and configuration
    //provides a pure sql interface
    let users_sql = SqliteService::new("Users Store", "user_store", sqlite_config);
    let users_crud= SqliteServiceCrud::new("Users CRUD", "users_crud", "users_table", users_sql);
    let profiles_crud= SqliteServiceCrud::new("Profiles CRUD", "profiles_crud", "profiles_table", users_sql);
    
    // Add services to the node
    node.add_service(users_sql).await?;
    node.add_service(users_crud).await?;
    
    // Start the node
    node.start().await?;
    
    println!("Node started with SQLite services");
    
    // The node is now ready to handle requests
    Ok(())
}

## API Usage

### Pure SQLite API

```rust
// Execute a SQL statement with typed parameters
let params = Params::new()
    .with_value("name", "John")
    .with_value("email", "john@email.com")
    .with_value("age", 45);

let query = SqlQuery::new(
    "INSERT INTO users (name, email, age) VALUES ($name, $email, $age)"
).with_params(params);

let result = node.request("users_db/execute", Some(query)).await?;

// Query data with typed parameters
let query_params = Params::new()
    .with_value("name", "John%");

let query = SqlQuery::new(
    "SELECT * FROM users WHERE name LIKE $name"
).with_params(query_params);

let users = node.request("users_db/query", Some(query)).await?;
```

### SQLite CRUD API

```rust
// Create a user with typed data
let create_op = CrudOperation::Create(CreateOperation {
    table: "users".to_string(),
    data: vec![
        ("name".to_string(), Value::Text("John".to_string())),
        ("email".to_string(), Value::Text("john@email.com".to_string())),
        ("age".to_string(), Value::Integer(45)),
    ].into_iter().collect(),
});

let created_user = node.request("users_store", Some(create_op)).await?;

// Update a user with typed query and update
let update_op = CrudOperation::Update(UpdateOperation {
    table: "users".to_string(),
    query: Query::new()
        .with_condition("email", QueryOperator::Equal(Value::Text("john@email.com".to_string()))),
    updates: vec![
        ("age".to_string(), Value::Integer(42)),
    ].into_iter().collect(),
});

let updated = node.request("users_store", Some(update_op)).await?;

// Delete a user with typed query
let delete_op = CrudOperation::Delete(DeleteOperation {
    table: "users".to_string(),
    query: Query::new()
        .with_condition("email", QueryOperator::Equal(Value::Text("john@email.com".to_string()))),
});

let deleted = node.request("users_store", Some(delete_op)).await?;
let deleted = node.request("users_store/delete", Some(delete_params)).await?;

// Find users with advanced query
let find_query = ArcValueType::new_map(HashMap::from([
    ("name".to_string(), ArcValueType::new_map(HashMap::from([
        ("$like".to_string(), ArcValueType::new_primitive("john%")),
    ]))),
]));

// Find users with advanced query using typed operators
let find_op = CrudOperation::Read(ReadOperation {
    table: "users".to_string(),
    query: Query::new()
        .with_condition("age", QueryOperator::GreaterThan(Value::Integer(30)))
        .with_condition("age", QueryOperator::LessThan(Value::Integer(50)))
        .with_condition("name", QueryOperator::Like("J%".to_string())),
    fields: None,
    limit: Some(10),
    offset: None,
    order_by: Some(vec![("name".to_string(), true)]),
});

let users = node.request("users_store", Some(find_op)).await?;
```

## Advanced Query Support

The SQLite CRUD service supports advanced queries with type-safe operators:

### Comparison Operators
- `QueryOperator::Equal(value)`: Equal to
- `QueryOperator::NotEqual(value)`: Not equal to
- `QueryOperator::GreaterThan(value)`: Greater than
- `QueryOperator::GreaterThanOrEqual(value)`: Greater than or equal to
- `QueryOperator::LessThan(value)`: Less than
- `QueryOperator::LessThanOrEqual(value)`: Less than or equal to
- `QueryOperator::Like(pattern)`: SQL LIKE pattern
- `QueryOperator::In(values)`: Value in a list of values

### Example Queries

```rust
// Find users with age between 30 and 50 and name starting with 'J'
let query = Query::new()
    .with_condition("age", QueryOperator::GreaterThan(Value::Integer(30)))
    .with_condition("age", QueryOperator::LessThan(Value::Integer(50)))
    .with_condition("name", QueryOperator::Like("J%".to_string()));

// Find users with specific IDs
let query = Query::new().with_condition(
    "id",
    QueryOperator::In(vec![
        Value::Integer(1),
        Value::Integer(2),
        Value::Integer(3),
    ])
);

// Complex query with multiple conditions
let query = Query::new()
    .with_condition("status", QueryOperator::Equal(Value::Text("active".to_string())))
    .with_condition("created_at", QueryOperator::GreaterThan(Value::Text("2023-01-01".to_string())));
```

## Implementation Details

The SQLite mixin implementation is built with type safety and maintainability in mind:

### Core Components

1. **Schema Definition**
   - Strongly-typed schema definitions with compile-time validation
   - Support for tables, columns, constraints, and indexes
   - Foreign key relationships with configurable actions

2. **SQLite Service**
   - Thread-safe connection pooling
   - Transaction support
   - Prepared statement caching
   - Connection lifecycle management

3. **CRUD Operations**
   - Type-safe query building
   - Parameterized queries to prevent SQL injection
   - Support for complex queries with multiple conditions
   - Pagination and sorting

### Design Principles

- **Type Safety**: Strong typing throughout the API to catch errors at compile time
- **Immutability**: Builder pattern for creating immutable query objects
- **Composability**: Operations can be easily composed to build complex queries
- **Performance**: Efficient query building and execution
- **Extensibility**: Easy to add new query operators and functionality

### Error Handling

- Comprehensive error types for different failure modes
- Clear error messages for debugging
- Proper resource cleanup in case of failures

### Example: Complex Query with Joins

```rust
// Example of a more complex query with joins
let query = SqlQuery::new(
    "SELECT u.name, p.bio FROM users u 
     JOIN profiles p ON u.id = p.user_id 
     WHERE u.age > $min_age AND p.bio LIKE $bio_pattern"
).with_params(
    Params::new()
        .with_value("min_age", 21)
        .with_value("bio_pattern", "%Rust%")
);

let results = node.request("users_db/query", Some(query)).await?;
```

The implementation is designed to be flexible and extensible, allowing for easy integration with other services in the Runar framework while maintaining strong type safety and clear API contracts.