#!/bin/bash
# Script to check a specific macro expansion
# Usage: ./check_specific_macro.sh <macro_type>
# Example: ./check_specific_macro.sh service_macro

set -e

# Check if cargo-expand is installed
if ! command -v cargo-expand &> /dev/null; then
    echo "cargo-expand is not installed. Installing..."
    cargo install cargo-expand
fi

# Validate input
if [ -z "$1" ]; then
    echo "Error: Please specify a macro type."
    echo "Usage: ./check_specific_macro.sh <macro_type>"
    echo "Available macro types:"
    echo "  - service_macro"
    echo "  - action_macro"
    echo "  - event_macros"
    exit 1
fi

MACRO_TYPE="$1"
CRATE_DIR="$(dirname "$(dirname "$0")")"
cd "$CRATE_DIR"

EXAMPLES_DIR="src/examples"
OUTPUT_DIR="expansion_outputs"

# Check if the specified macro file exists
if [ ! -f "$EXAMPLES_DIR/${MACRO_TYPE}.rs" ]; then
    echo "Error: Macro file $EXAMPLES_DIR/${MACRO_TYPE}.rs does not exist."
    echo "Available macro files:"
    ls -1 "$EXAMPLES_DIR"/*.rs | xargs -n1 basename
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate output file path
OUTPUT_FILE="$OUTPUT_DIR/${MACRO_TYPE}_expansion.rs"

echo "Checking expansion for $MACRO_TYPE..."
echo "Running cargo expand..."

# Run cargo-expand and save output
cargo expand --package runar-macros-tests --features=full_test --file "$EXAMPLES_DIR/${MACRO_TYPE}.rs" > "$OUTPUT_FILE"

echo "Expansion saved to $OUTPUT_FILE"
echo ""
echo "=== EXPANSION OUTPUT SUMMARY ==="
echo ""

# Show summary of the expansion (first 20 lines)
head -n 20 "$OUTPUT_FILE"
echo "..."
echo "(Output truncated. See $OUTPUT_FILE for the full expansion)"

# Check if the expansion was successful
if [ -s "$OUTPUT_FILE" ]; then
    echo ""
    echo "✅ Expansion generated successfully"
else
    echo ""
    echo "❌ Empty expansion output - possible error"
    exit 1
fi

exit 0 