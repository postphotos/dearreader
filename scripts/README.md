# Scripts Directory

This directory contains utility scripts for DearReader.

## Utility Scripts

- **`quickstart.sh`** - One-click setup and start script (fastest way to get started)
  - Can be run from anywhere: `./scripts/quickstart.sh` or `scripts/quickstart.sh`
  - Automatically finds the project root and navigates there
- **`verify.sh`** - System verification script (check if your system is ready)
- **`cleanup.sh`** - Safe cleanup utility for removing old/deprecated files
  - Can be run from anywhere: `./scripts/cleanup.sh` or `scripts/cleanup.sh`
  - Automatically finds the project root and navigates there

## Legacy Scripts

The `legacy/` subdirectory contains old scripts that have been replaced by the unified `./dearreader` CLI:

- **`setup.sh`** - Replaced by `./dearreader setup`
- **`dev.sh`** - Replaced by `./dearreader dev`
- **`run.sh`** - Replaced by `./dearreader <command>`

These legacy scripts still work but show migration notices pointing to the new unified CLI.

## Usage

```bash
# Check if your system is ready
./scripts/verify.sh

# Quick start (works from anywhere!)
./scripts/quickstart.sh

# Manual setup
./dearreader setup

# Clean up old files
./scripts/cleanup.sh
```
