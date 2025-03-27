# Documentation and Service Routing Fixes

## Update: Document Split

This specification has been split into two more focused documents:

1. [Service Routing Consistency Fix](service_routing_consistency_fix.md) - Addresses the architectural inconsistency in how services are addressed in request routing
2. [Documentation Updates for Modern API Patterns](documentation_updates.md) - Addresses updating documentation to reflect current vmap macro patterns

Please refer to these individual documents for detailed implementation plans for each area.

## Overview

This document originally outlined two critical improvement areas for the Runar Node system:

1. **Documentation Updates**: Many documentation files contain outdated examples, particularly with respect to the `vmap` macro system, which has recently been overhauled. 

2. **Service Routing Consistency**: There's an architectural inconsistency in how services are addressed in request routing. The tests use service names for routing (e.g., `explorer/land`), while the architectural guidelines specify that service paths should be used (e.g., `ship/land`).

To provide more focused implementation plans, these issues have been separated into the documents listed above.

## Next Steps

We are prioritizing the Service Routing Consistency Fix and will begin implementation according to the plan outlined in that document.

The documentation updates will follow as a second phase of work after the routing fixes are completed. 