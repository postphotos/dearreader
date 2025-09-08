# Migration Guide: From Old Scripts to Unified CLI

## Overview
DearReader now uses a single, unified CLI tool (`./dearreader`) that replaces the previous three separate scripts. This provides a more delightful and consistent user experience.

## Old vs New Commands

| Old Command | New Command | Description |
|-------------|-------------|-------------|
| `./setup.sh` | `./dearreader setup` | Set up development environment |
| `./dev.sh` | `./dearreader dev` | Start development environment |
| `./run.sh setup` | `./dearreader setup` | Setup (now unified) |
| `./run.sh dev` | `./dearreader dev` | Development (now unified) |
| `./run.sh test all` | `./dearreader test all` | Run all tests |
| `./run.sh test js` | `./dearreader test js` | Run JS tests only |
| `./run.sh test python` | `./dearreader test python` | Run Python tests only |
| `./run.sh run prod` | `./dearreader run prod` | Start production |
| `./run.sh stop` | `./dearreader stop` | Stop all services |

## New Features in Unified CLI

### Enhanced Commands
- `status` - Check system status and health
- `logs` - View service logs with follow option
- `clean` - Clean up containers and volumes
- `api test` - Test API endpoints

### Better Options
- `--verbose, -v` - Show detailed output
- `--force, -f` - Continue despite errors
- `--follow, -F` - Follow logs in real-time

### Improved User Experience
- 🎨 Beautiful colored output with emojis
- 📊 Better progress indicators
- 🛡️ Enhanced error handling
- 📝 Comprehensive help system

## Migration Steps

1. **Make the new script executable:**
   ```bash
   chmod +x ./dearreader
   ```

2. **Update your workflow:**
   ```bash
   # Old way
   ./run.sh setup --verbose
   ./run.sh dev

   # New way
   ./dearreader setup
   ./dearreader dev
   ```

3. **Test the new commands:**
   ```bash
   ./dearreader status    # Check system status
   ./dearreader logs -F   # Follow logs
   ./dearreader api test  # Test API endpoints
   ```

## Backwards Compatibility

The old scripts (`setup.sh`, `dev.sh`, `run.sh`) are still available but deprecated. They will show a migration message pointing to the new unified CLI.

## Benefits of Unified CLI

- **Single Tool**: One command for all operations
- **Better UX**: Colors, emojis, and clear feedback
- **More Features**: Status checks, API testing, cleanup
- **Consistent**: Same interface across all commands
- **Future-Proof**: Easier to add new features

## Getting Help

```bash
./dearreader help          # Show all commands
./dearreader --help        # Same as above
./dearreader help          # Detailed help with examples
```
