#!/bin/bash

# Cleanup script for DearReader
# Removes old redundant files after migration to unified CLI

set -e

echo "🧹 DearReader Cleanup Utility"
echo "============================"

echo "This script will help you clean up old files after migrating to the unified CLI."
echo ""

# Check if new CLI exists
if [ ! -f "./dearreader" ]; then
    echo "❌ Error: ./dearreader not found. Please run setup first."
    exit 1
fi

echo "📋 Files that can be safely removed:"
echo ""

# List old scripts
OLD_SCRIPTS=("setup.sh" "dev.sh" "run.sh")
for script in "${OLD_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "  🗑️  $script (replaced by ./dearreader)"
    fi
done

# List redundant directories
if [ -d "jsf" ]; then
    echo "  🗑️  jsf/ (redundant, use js/ instead)"
fi

# List test files that might not be needed
TEST_FILES=("TEST_HANGING_PREVENTION.md")
for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  🗑️  $file (legacy test documentation)"
    fi
done

echo ""
read -p "Do you want to remove these files? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing old files..."

    # Remove old scripts
    for script in "${OLD_SCRIPTS[@]}"; do
        if [ -f "$script" ]; then
            rm "$script"
            echo "  ✅ Removed $script"
        fi
    done

    # Remove redundant jsf directory
    if [ -d "jsf" ]; then
        rm -rf "jsf"
        echo "  ✅ Removed jsf/ directory"
    fi

    # Remove legacy test files
    for file in "${TEST_FILES[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  ✅ Removed $file"
        fi
    done

    echo ""
    echo "✅ Cleanup complete!"
    echo "🎉 Your DearReader installation is now streamlined."
else
    echo "ℹ️  Cleanup cancelled. Files remain unchanged."
fi

echo ""
echo "📚 Remember to use ./dearreader for all operations!"
echo "   Run './dearreader help' for available commands."
