# NATS Subject Rules and Guidelines

NATS (Neural Autonomic Transport System) is a lightweight, high-performance messaging system that uses a publish-subscribe model with subject-based addressing. This document provides a detailed overview of NATS subjects, including their structure, rules, wildcards, security considerations, and constraints. It is intended as a reference for software developers building applications with NATS.

---

## 1. Introduction to NATS Subjects

- **Definition**: Subjects in NATS are strings that define the channels for sending and receiving messages. Publishers send messages to a specific subject, and subscribers listen to subjects to receive those messages.
- **Hierarchical Structure**: Subjects are organized hierarchically using dots (`.`) as separators, creating a namespace-like structure. Examples:
  - `events.user.created`: A message about a user being created in an events system.
  - `time.us.east.atlanta`: A time-related message for Atlanta in the eastern US.
- **Purpose**: Subjects enable flexible, decoupled communication between distributed systems by routing messages based on their content.

---

## 2. Rules for Subject Names

NATS imposes specific rules on subject names to ensure consistency and proper functionality.

- **Valid Characters**:
  - Alphanumeric characters: `a-z`, `A-Z`, `0-9`.
  - Dots (`.`) as separators.
  - Wildcards (`*` and `>`) are allowed only in subscriptions (see section 3).
- **Case Sensitivity**: Subjects are case-sensitive. For example, `User.Created` is distinct from `user.created`.
- **Length**: No strict limit, but practical limits depend on server configuration and client libraries (typically < 1024 characters).
- **Restrictions**:
  - **Non-Empty**: Subjects must not be empty. An empty string (`""`) is invalid.
  - **No Leading/Trailing Dots**: Subjects cannot start or end with a dot. Examples:
    - Invalid: `.events`, `events.`
    - Valid: `events`, `events.user`
  - **No Consecutive Dots**: Only single dots are allowed as separators. Example:
    - Invalid: `events..user`
    - Valid: `events.user`
  - **No Spaces**: Spaces are not permitted. Use dots instead. Example:
    - Invalid: `events user`
    - Valid: `events.user`
- **Reserved Subjects**:
  - Subjects starting with `$` (e.g., `$SYS`, `$JS`) are reserved for system use, such as monitoring or JetStream. Applications should avoid using `$`-prefixed subjects unless interacting with NATS system features.

---

## 3. Wildcards in NATS

NATS supports two types of wildcards for subscriptions, enabling subscribers to dynamically match multiple subjects. **Wildcards are only valid in subscriptions, not in publish subjects.**

### 3.1. Single-Level Wildcard (`*`)

- **Behavior**: Matches exactly one token at a specific level in the subject hierarchy.
- **Syntax**: `*` replaces a single dot-separated segment.
- **Examples**:
  - Subscription: `events.*.created`
    - Matches: `events.user.created`, `events.order.created`
    - Does not match: `events.created`, `events.user.login.created`
  - Subscription: `*.info`
    - Matches: `system.info`, `user.info`
    - Does not match: `info`, `system.sub.info`
- **Rules**:
  - Must be bounded by dots or be at the start/end of the subject (e.g., `*.info`, `info.*`, `a.*.b`).
  - Cannot be standalone (`*` alone is invalid).

### 3.2. Multi-Level Wildcard (`>`)

- **Behavior**: Matches all remaining tokens at and beyond its position in the subject hierarchy.
- **Syntax**: `>` must appear at the end of the subject string.
- **Examples**:
  - Subscription: `events.>`
    - Matches: `events.user.created`, `events.order.updated.status`, `events`
    - Does not match: `system.events.created`
  - Subscription: `system.monitor.>`
    - Matches: `system.monitor.cpu`, `system.monitor.disk.usage`
    - Does not match: `system.info`
- **Rules**:
  - Must be the last character in the subject (e.g., `events.>` is valid; `events.>.user` is invalid).
  - Cannot appear mid-subject (e.g., `a.>.b` is invalid).
  - Matches zero or more tokens, including the base subject if no additional tokens follow.

### 3.3. Wildcard Constraints

- **Publish Restriction**: Wildcards (`*`, `>`) are not allowed in publish subjects. For example, publishing to `events.*.created` is invalid.
- **Mixing Wildcards**:
  - Multiple `*` wildcards are allowed: `a.*.*.d` matches `a.b.c.d`.
  - `*` and `>` can be combined, but `>` must be last: `a.*.>` matches `a.b.c`, `a.x.y.z`.
- **No Partial Matching**: Wildcards match entire tokens, not partial strings. For example, `event*` is invalid; use `events.*` instead.

---

## 4. Subject Matching Rules

- **Exact Match for Publish**: Publishers must use exact subject strings without wildcards.
- **Subscription Matching**:
  - **Literal Match**: A subscription to `events.user.created` matches only publishes to `events.user.created`.
  - **Wildcard Match**: Subscriptions with wildcards match publishes according to the rules in section 3.
- **Token-Based Matching**: Matching is based on dot-separated tokens, not regular expressions or partial string matching.

---

## 5. Queue Groups and Subjects

- **Queue Subscriptions**: Subjects can be paired with queue groups to distribute messages among multiple subscribers.
- **Behavior**:
  - Queue subscriptions can use wildcards (e.g., `events.*.created` with queue name `workers`).
  - Only one subscriber in the queue group receives each message, even with wildcard matches.

---

## 6. Security and Subject Permissions

NATS provides subject-based authorization to control who can publish or subscribe to specific subjects.

- **Permissions**:
  - **Allow**: Specifies subjects a user can publish to or subscribe to, including wildcards.
  - **Deny**: Specifies subjects a user cannot access, overriding allow rules.
- **Examples**:
  - Allow: `events.*` (user can publish/subscribe to `events.user`, `events.order`).
  - Deny: `system.>` (blocks all system-related subjects).
- **Rules**:
  - Permissions use the same wildcard syntax (`*`, `>`).
  - Denied subjects take precedence over allowed ones in the same hierarchy.

---

## 7. JetStream and Subjects

JetStream, NATS' persistence layer, integrates with subjects to provide message storage and replay capabilities.

- **Stream Subjects**:
  - Streams can capture messages from subjects using wildcards (e.g., `events.>` captures all `events.*` messages).
- **Consumer Subjects**:
  - Consumers can subscribe to specific subjects or wildcards within a stream.
- **Mirrors and Sources**:
  - Mirror and source streams inherit subject rules from their origin streams.

---

## 8. Constraints and Best Practices

- **Performance**:
  - Excessive use of wildcards, especially `>`, can increase matching overhead and impact performance.
  - Use specific subjects where possible to optimize routing.
- **Naming Conventions**:
  - Use meaningful, hierarchical names (e.g., `service.region.action`).
  - Avoid reserved prefixes like `$`.
- **Security**:
  - Restrict access to sensitive subjects using allow/deny rules.
  - Regularly review permissions to prevent unauthorized access.

---

## 9. Summary

NATS subjects are a core feature of its publish-subscribe system, enabling efficient message routing. Understanding their rules—such as hierarchical structure, wildcard usage, security configurations, and constraints—is essential for building robust NATS-based applications.

### Key Points

- Subjects use dots (`.`) as separators.
- Wildcards (`*` and `>`) are for subscriptions only.
- Security is managed through subject-based permissions.
- JetStream integrates subjects for persistence.

For more details, consult the [official NATS documentation](https://docs.nats.io).

---