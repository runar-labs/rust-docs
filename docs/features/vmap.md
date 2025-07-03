# ValueMap (VMap)

ValueMap (VMap) provides an ergonomic interface for working with structured data in Runar applications. It simplifies parameter extraction and creation using a set of powerful macros.

## Key Features

- **Type-safe parameter extraction** with sensible defaults
- **Specialized macros** for different data types
- **Nested key access** with dot notation
- **Type inference** from default values
- **Comprehensive error handling**

## Basic Usage

```rust
// Create a map with key-value pairs
let params = vmap! {
    "name" => "user123",
    "age" => 30,
    "is_active" => true,
    "tags" => ["admin", "premium"],
    "profile" => {
        "address" => "123 Main St",
        "created_at" => "2023-01-15T08:30:00Z"
    }
};

// Extract values with defaults
let username = vmap!(params, "name" => "guest");
let age = vmap!(params, "age" => 0);
let is_active = vmap!(params, "is_active" => false);

// Nested key access with dot notation
let address = vmap!(params, "profile.address" => "Unknown");
```

## Complete Macro Reference

### General-Purpose Macro

The `vmap!` macro has two forms:

1. Creating a map:
   ```rust
   let params = vmap! {
       "key1" => "value1",
       "key2" => 42,
       "key3" => true
   };
   ```

2. Extracting values:
   ```rust
   let value = vmap!(source, "key" => default_value);
   ```

### Type-Specific Extraction Macros

Specialized macros provide cleaner code with type-specific default values:

#### String Values
```rust
// Using general vmap! macro
let name = vmap!(params, "name" => String::new());

// Using specialized macro - cleaner!
let name = vmap_str!(params, "name" => "");
```

#### Integer Values
```rust
// Signed integers
let count = vmap_i32!(params, "count" => 0);
let small_num = vmap_i8!(params, "small_num" => 0);
let medium_num = vmap_i16!(params, "medium_num" => 0);
let large_num = vmap_i64!(params, "large_num" => 0);

// Unsigned integers
let byte_val = vmap_u8!(params, "byte_val" => 0);
let positive_num = vmap_u32!(params, "positive_num" => 0);
let big_num = vmap_u64!(params, "big_num" => 0);
```

#### Floating Point Values
```rust
let price = vmap_f64!(params, "price" => 0.0);
let rating = vmap_f32!(params, "rating" => 0.0);
```

#### Boolean Values
```rust
let is_enabled = vmap_bool!(params, "is_enabled" => false);
```

#### Collections
```rust
let tags = vmap_vec!(params, "tags" => Vec::<String>::new());
```

#### Date and Time (with chrono feature)
```rust
let created_date = vmap_date!(params, "created_date" => 
    chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap());

let updated_at = vmap_datetime!(params, "updated_at" => chrono::Utc::now());
```

### Nested Key Access

All macros support dot notation for accessing nested values:

```rust
// Deeply nested data
let params = vmap! {
    "user" => {
        "profile" => {
            "contact" => {
                "email" => "user@example.com"
            }
        }
    }
};

// Access with dot notation
let email = vmap_str!(params, "user.profile.contact.email" => "no-email");
```

### Optional Values

For truly optional values (not just providing defaults):

```rust
// Check if key exists first
let optional_value = if params.contains_key("optional_field") {
    Some(vmap!(params, "optional_field" => String::new()))
} else {
    None
};

// Pattern matching on result
match optional_value {
    Some(value) => println!("Found value: {}", value),
    None => println!("Value not provided")
}
```

## Practical Examples

### Service Parameter Extraction

```rust
#[action]
async fn handle_create_user(&self, username: String, email: String, full_name: Option<String>, age: Option<i32>, is_admin: Option<bool>, ctx: &RequestContext) -> Result<String> {
    // Validate required fields (type system ensures non-empty)
    if username.is_empty() || email.is_empty() {
        anyhow::bail!("Username and email are required");
    }
    
    // Use provided values or sensible defaults
    let full_name = full_name.unwrap_or_else(|| username.clone());
    let age = age.unwrap_or(0);
    let is_admin = is_admin.unwrap_or(false);
    
    // Create user...
    let user_id = create_user(username, email, full_name, age, is_admin).await?;
    
    // Return the user ID directly
    Ok(user_id)
}
```

### Event Data Extraction

```rust
async fn on_user_updated(&self, payload: ArcValue) -> Result<()> {
    // Extract event data with appropriate defaults
    let user_id = vmap_str!(payload, "user_id" => "");
    let old_email = vmap_str!(payload, "old_email" => "");
    let new_email = vmap_str!(payload, "new_email" => "");
    
    // Process email change notification
    if !old_email.is_empty() && !new_email.is_empty() && old_email != new_email {
        let notification_data = vmap! {
            "user_id" => user_id,
            "type" => "email_changed",
            "old_email" => old_email,
            "new_email" => new_email
        };
        
        self.notification_service.send_notification(notification_data).await?;
    }
    
    Ok(())
}
```

### Response Data Handling

```rust
async fn get_user_details(node: &Node, user_id: &str) -> Result<UserDetails> {
    // Make service request - returns the User struct directly
    let user: User = node.request("user_service/get_user", Some(ArcValue::new_primitive(user_id))).await?;
    
    // If you need to extract from ArcValue payloads (e.g., events), use vmap macros:
    let payload = ArcValue::from_struct(&user);
    let username = vmap_str!(payload, "username" => "");
    let email = vmap_str!(payload, "email" => "");
    
    // But typically you'd just use the struct fields directly
    Ok(UserDetails {
        user_id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        address: user.profile.address,
        phone: user.profile.phone
    })
}
```

## Error Handling

```rust
// With error propagation
fn get_required_param(params: &ArcValue, name: &str) -> Result<String> {
    let value = vmap_str!(params, name => "");
    if value.is_empty() {
        Err(anyhow!("Missing required parameter: {}", name))
    } else {
        Ok(value)
    }
}

// With pattern matching
match vmap_i32!(params, "count" => -1) {
    n if n < 0 => println!("Parameter 'count' not found"),
    0 => println!("Count is zero"),
    n => println!("Count is {}", n)
}
```

## Best Practices

1. **Use specialized macros** for better readability:
   - `vmap_str!`, `vmap_i32!`, `vmap_bool!`, etc. instead of generic `vmap!`

2. **Provide sensible defaults** that match your application's logic

3. **Use dot notation** for nested access instead of multiple extraction steps

4. **Extract and validate** parameters at function entry points

5. **Use type inference** from defaults instead of explicit type annotations

## Implementation Details

The VMap implementation consists of:
- The `VMap` struct wrapping a `HashMap<String, ArcValue>`
- Type-specific extraction methods for different data types
- The `vmap!` macro with type inference for simplified access
- Specialized macros for common data types
- Support for nested key access via dot notation

## Related Documentation

- Context System - Context for secure communication
- Request Handling - Using VMap in request handlers
- Service Lifecycle - Service lifecycle and initialization
- Logging System - Context-aware, structured logging 