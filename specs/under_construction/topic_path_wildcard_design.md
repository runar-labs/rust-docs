# TopicPath Wildcard System Design

## Overview

This document outlines the design for adding wildcard support to the TopicPath system in the Runar Node architecture. The design prioritizes performance, clean APIs, and efficient subscription matching.

## Key Requirements

1. **No Backward Compatibility Required**: We will implement the best solution without concern for compatibility with existing code. Clients will need to update.
2. **Performance-First**: Design for optimal matching performance, even with large numbers of subscriptions.
3. **Clean API**: Create intuitive interfaces without legacy accommodations.
4. **Direct HashMap Support**: Implement proper Hash and Eq traits to use TopicPath directly in HashMaps.

## Wildcard Types

We will support two types of wildcards:

1. **Single-Segment Wildcard (`*`)**: Matches exactly one segment in a path.
   - Example: `services/*/state` matches `services/math/state` but not `services/auth/login/state`.

2. **Multi-Segment Wildcard (`>`)**: Matches one or more segments to the end of the path.
   - Example: `services/>` matches `services/math`, `services/auth/login`, etc.
   - Must be the last segment in a pattern.

## Data Structure Design

### TopicPath Enhancements

The current TopicPath will be redesigned to natively support wildcards:

```rust
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TopicPath {
    /// Full path string representation (for display/debug)
    path: String,
    
    /// Network ID portion
    network_id: String,
    
    /// Path segments after network ID
    segments: Vec<PathSegment>,
    
    /// Whether this path contains wildcards
    is_pattern: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum PathSegment {
    /// Regular literal segment
    Literal(String),
    
    /// Single-segment wildcard (*)
    SingleWildcard,
    
    /// Multi-segment wildcard (>)
    MultiWildcard,
}
```

### Hash and Eq Implementation

To enable direct use in HashMaps, we'll implement custom Hash and Eq traits:

```rust
impl Hash for TopicPath {
    fn hash<H: Hasher>(&self, state: &mut H) {
        // Hash network_id
        self.network_id.hash(state);
        
        // Hash segments
        for segment in &self.segments {
            match segment {
                PathSegment::Literal(s) => {
                    // Hash code 0 for literal + the string
                    0.hash(state);
                    s.hash(state);
                },
                PathSegment::SingleWildcard => {
                    // Hash code 1 for single wildcard
                    1.hash(state);
                },
                PathSegment::MultiWildcard => {
                    // Hash code 2 for multi wildcard
                    2.hash(state);
                }
            }
        }
    }
}

impl PartialEq for TopicPath {
    fn eq(&self, other: &Self) -> bool {
        // For exact equality, both paths must be identical
        if self.network_id != other.network_id || self.segments.len() != other.segments.len() {
            return false;
        }
        
        for (s1, s2) in self.segments.iter().zip(other.segments.iter()) {
            if s1 != s2 {
                return false;
            }
        }
        
        true
    }
}

impl Eq for TopicPath {}
```

### Pattern Matching Implementation

We'll implement an efficient pattern matching method:

```rust
impl TopicPath {
    /// Check if this path matches the given pattern
    pub fn matches(&self, pattern: &TopicPath) -> bool {
        // Network IDs must match exactly
        if self.network_id != pattern.network_id {
            return false;
        }
        
        // If pattern is not a wildcard pattern, use exact equality
        if !pattern.is_pattern {
            return self == pattern;
        }
        
        // Otherwise, perform segment-by-segment matching
        self.segments_match(&self.segments, &pattern.segments)
    }
    
    // Internal helper for segment matching
    fn segments_match(&self, path_segments: &[PathSegment], pattern_segments: &[PathSegment]) -> bool {
        // Handle various pattern matching cases
        // (detailed algorithm will be implemented here)
        // ...
    }
}
```

## Subscription Storage Design

For optimal subscription lookups, we'll implement a specialized data structure:

### WildcardSubscriptionRegistry

```rust
pub struct WildcardSubscriptionRegistry<T> {
    /// Exact matches (no wildcards) - fastest lookup
    exact_matches: HashMap<TopicPath, Vec<T>>,
    
    /// Patterns with single wildcards
    single_wildcard_patterns: Vec<(TopicPath, Vec<T>)>,
    
    /// Patterns with multi-segment wildcards
    multi_wildcard_patterns: Vec<(TopicPath, Vec<T>)>,
}
```

This structure optimizes for the common case (exact matches) while still supporting efficient wildcard lookups. We separate single and multi-wildcards since their matching algorithms differ.

### Lookup Algorithm

For finding all matches for a given topic:

```rust
impl<T> WildcardSubscriptionRegistry<T> {
    pub fn find_matches(&self, topic: &TopicPath) -> Vec<&T> {
        let mut matches = Vec::new();
        
        // 1. Check exact matches (O(1) lookup)
        if let Some(handlers) = self.exact_matches.get(topic) {
            matches.extend(handlers.iter());
        }
        
        // 2. Check single wildcard patterns (iterate through patterns)
        for (pattern, handlers) in &self.single_wildcard_patterns {
            if topic.matches(pattern) {
                matches.extend(handlers.iter());
            }
        }
        
        // 3. Check multi-wildcard patterns (iterate through patterns)
        for (pattern, handlers) in &self.multi_wildcard_patterns {
            if topic.matches(pattern) {
                matches.extend(handlers.iter());
            }
        }
        
        matches
    }
}
```

## Subscription Handling

To integrate with the existing subscription system:

```rust
impl ServiceRegistry {
    pub async fn subscribe(&self, topic: &TopicPath, callback: Arc<EventCallback>) -> Result<String> {
        // Generate subscription ID
        let subscription_id = Uuid::new_v4().to_string();
        
        // Store in appropriate collection based on whether topic is a pattern
        if topic.is_pattern {
            if topic.has_multi_wildcard() {
                // Add to multi-wildcard patterns
                self.subscriptions.multi_wildcard_patterns.push((topic.clone(), vec![callback]));
            } else {
                // Add to single-wildcard patterns
                self.subscriptions.single_wildcard_patterns.push((topic.clone(), vec![callback]));
            }
        } else {
            // Add to exact matches
            self.subscriptions.exact_matches
                .entry(topic.clone())
                .or_insert_with(Vec::new)
                .push(callback);
        }
        
        // Store subscription mapping for later unsubscribe
        self.subscription_ids.write().await.insert(subscription_id.clone(), topic.clone());
        
        Ok(subscription_id)
    }
}
```

## Performance Optimizations

1. **Pre-compilation of Patterns**: Parse wildcards once when creating the TopicPath
2. **Specialized Storage**: Different storage strategies for exact matches vs wildcard patterns
3. **Tiered Matching**: Check exact matches before scanning wildcard patterns
4. **Segment Vector**: Pre-split path segments for faster matching
5. **Bloom Filters**: Consider adding bloom filters for large subscription sets to quickly eliminate non-matches
6. **Caching**: Cache recent match results

## Memory Considerations

1. **Shared Segments**: Consider interning common path segments to reduce memory usage
2. **Compact Representation**: Use specialized data structures for segment storage
3. **Lazy Pattern Compilation**: Only evaluate pattern matching components when needed

## Usage Examples

```rust
// Creating topics with wildcards
let pattern1 = TopicPath::new("main:services/*/state")?;
let pattern2 = TopicPath::new("main:events/>")?;

// Subscribing to wildcard patterns
node.subscribe(pattern1, callback1).await?;
node.subscribe(pattern2, callback2).await?;

// Publishing (matches will be found automatically)
node.publish("main:services/math/state", data).await?;
node.publish("main:events/user/created", data).await?;
```

## Testing Strategy

1. **Unit Tests**: 
   - Test wildcard pattern creation/validation
   - Test pattern matching algorithms with various patterns
   - Test edge cases (empty segments, patterns at start/middle/end)

2. **Performance Tests**:
   - Benchmark match performance with increasing subscription counts
   - Compare exact vs wildcard match performance
   - Measure memory usage

3. **Integration Tests**:
   - Verify correct callback invocation with overlapping patterns
   - Test subscription and unsubscription with patterns

## Implementation Plan

1. **Phase 1**: Implement core TopicPath enhancements
   - Update TopicPath structure
   - Implement parsing for wildcard patterns
   - Add pattern matching algorithm
   - Add Hash/Eq implementations

2. **Phase 2**: Implement WildcardSubscriptionRegistry
   - Implement specialized data structure
   - Add lookup algorithm
   - Update ServiceRegistry to use new structure

3. **Phase 3**: Update publish/subscribe API
   - Enhance subscription methods
   - Update event distribution logic
   - Implement unsubscribe for wildcard patterns

4. **Phase 4**: Testing and Optimization
   - Add comprehensive test suite
   - Benchmark and optimize
   - Document APIs and patterns

## Conclusion

This design provides a high-performance, clean API for wildcard topic matching. By foregoing backward compatibility, we can implement the optimal solution without constraints. The specialized data structures and algorithms will ensure efficient matching even with large numbers of subscriptions. 