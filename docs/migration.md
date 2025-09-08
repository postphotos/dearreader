# Migration Guide: From Old Scripts to Unified CLI

## Overview
DearReader now uses a single, unified CLI tool (`./dearreader`) that replaces the previous three separate scripts. This provides a more delightful and consistent user experience.

## Old vs New Commands

| Old Command | New Command | Description |
|-------------|-------------|-------------|
| `./setup.sh` | `./scripts/setup.sh` | Set up development environment |
| `./dev.sh` | `./scripts/dev.sh` | Start development environment |
| `./run.sh setup` | `./scripts/setup.sh` | Setup (now unified) |
| `./run.sh dev` | `./scripts/dev.sh` | Development (now unified) |
| `./run.sh test all` | `cd js && npm test` | Run JS tests |
| `./run.sh test js` | `cd js && npm test` | Run JS tests only |
| `./run.sh test python` | `cd py && python demo.py` | Run Python demo |
| `./run.sh run prod` | `cd js && npm run serve` | Start production |
| `./run.sh stop` | `pkill -f "node.*serve"` | Stop all services |

## New Features in Updated Scripts

### Enhanced Commands
- `scripts/setup.sh` - Build Docker images and setup environment
- `scripts/dev.sh` - Start development environment
- `scripts/run.sh` - Run specific tasks like testing
- `scripts/quickstart.sh` - One-command setup and start

### Better User Experience
- Direct npm and Python commands
- Clear error messages
- Consistent script locations in `scripts/` directory

## Migration Steps

1. **Update your workflow:**
   ```bash
   # Old way
   ./run.sh setup --verbose
   ./run.sh dev

   # New way
   ./scripts/setup.sh
   ./scripts/dev.sh
   ```

2. **Update test commands:**
   ```bash
   # Old way
   ./run.sh test all

   # New way
   cd js && npm test
   cd py && python demo.py
   ```

## Backwards Compatibility

The old scripts (`setup.sh`, `dev.sh`, `run.sh`) in the root directory are deprecated but may still work. They will show a migration message pointing to the new scripts in the `scripts/` directory.

## Benefits of Updated Scripts

- **Clear Organization**: Scripts organized in `scripts/` directory
- **Direct Commands**: Use npm and Python commands directly
- **Better Transparency**: See exactly what commands are running
- **Future-Proof**: Easier to maintain and update

## Getting Help

```bash
# Check available scripts
ls scripts/

# Get help for specific commands
cd js && npm run --help
cd py && python demo.py --help
```
