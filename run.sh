#!/bin/bash

 set -e

# Logging functions
log_info() {
    echo "[INFO] $1"
}

log_success() {
    echo "[SUCCESS] $1"
}

log_warn() {
    echo "[WARN] $1"
}

log_error() {
    echo "[ERROR] $1"
}

# Show usage
show_help() {
    echo "DearReader - Unified Project Runner"
    echo "==================================="
    echo ""
    echo "Usage: $0 <command> [subcommand] [options]"
    echo ""
    echo "Commands:"
    echo "  setup [--verbose]             Set up development environment"
    echo "  dev [--verbose]               Start development environment"
    echo "  test [js|python|all] [--verbose] [--force]"
    echo "                                 Run tests (default: all)"
    echo "  run [dev|prod] [--verbose]    Start services (default: dev)"
    echo "  stop [--verbose]              Stop all containers"
    echo "  --help                        Show this help message"
    echo ""
    echo "Options:"
    echo "  --verbose   Show live command output"
    echo "  --force     Continue even if some tests fail"
    echo ""
    echo "Examples:"
    echo "  $0 setup --verbose"
    echo "  $0 dev"
    echo "  $0 test all --verbose"
    echo "  $0 test js"
    echo "  $0 run prod"
    echo "  $0 stop --verbose"
}

# Check if verbose mode
VERBOSE=false
FORCE=false

# Parse flags
parse_flags() {
    while [[ $# -gt 0 ]]; do
        # Check if the argument is a flag
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            *)
                # If it's not a recognized flag, it's a command argument, so break
                shift
                ;;
        esac
    done
}

# Cross-platform command execution
run_cmd() {
    local cmd="$1"
    local description="$2"

    if [ "$VERBOSE" = true ]; then
        log_info "$description..."
        echo "  └─ Running: $cmd"
        eval "$cmd"
    else
        log_info "$description..."
        if ! eval "$cmd" >/dev/null 2>&1; then
            log_error "Command failed: $cmd"
            return 1
        fi
    fi
}

# Setup command (integrated from setup.sh)
cmd_setup() {
    local original_verbose="$VERBOSE" # Store original verbose state

    # Banner from setup.sh
    echo "🚀 Setting up DearReader Demo Environment"
    echo "======================================"

    echo "🚀 Setting up DearReader Docker Environment"
    echo "==========================================="

    log_info "Checking for Docker prerequisites..."

    # Docker prerequisite checks from setup.sh
    if ! command -v docker >/dev/null 2>&1; then
        log_error "❌ docker could not be found. Please install Docker (https://www.docker.com/get-started)"
        exit 1
    fi

    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "❌ docker-compose could not be found. Please install Docker Compose"
        exit 1
    fi

    # Test Docker connectivity
    if ! docker version >/dev/null 2>&1; then
        log_error "❌ Docker is not running. Please start Docker."
        exit 1
    fi

    log_success "✅ Docker setup verified"
    VERBOSE="$original_verbose" # Restore original verbose state

    # Docker image building from setup.sh
    run_cmd "docker-compose build" "📦 Building Docker images"

    # Completion message from setup.sh
    log_success "✅ Setup complete! You can now:"
    log_info "   - Start development: ./run.sh dev"
    log_info "   - Run tests: ./run.sh test all"
    log_info "   - Run JS tests only: ./run.sh test js"
    log_info "   - Run Python tests only: ./run.sh test python"
    log_info "   - Start production: ./run.sh run prod"
    log_info "   - Stop all: ./run.sh stop"

    # Create necessary directories from setup.sh (updated paths for flattened structure)
    run_cmd "mkdir -p storage" "📁 Creating storage directory"
    run_cmd "mkdir -p docker" "📁 Creating docker directory"
    run_cmd "mkdir -p logs" "📁 Creating logs directory"
    run_cmd "mkdir -p js/node_modules" "📁 Creating js/node_modules directory (updated for flattened structure)"

    # Ensure Dockerfile is in docker directory from setup.sh
    if [ -f "Dockerfile" ] && [ ! -f "docker/Dockerfile" ]; then
        run_cmd "mv Dockerfile docker/" "📁 Moving Dockerfile to docker/ directory"
    else
        log_info "📁 Dockerfile is already in docker/ directory"
    fi

    # Create default config if needed from setup.sh
    if [ ! -f "config.yaml" ]; then
        echo 'url: "http://localhost:3000"' > config.yaml
        log_info "📁 Created default config.yaml"
    else
        log_info "📁 config.yaml already exists"
    fi

    # Python virtual environment setup from setup.sh
    log_info "📥 Creating Python virtual environment..."
    if uv venv --clear; then
        log_success "✅ Virtual environment created successfully."
    else
        log_error "❌ Failed to create virtual environment. Please check your uv installation."
        exit 1
    fi

    # Cross-platform activation from setup.sh
    log_info "🔧 Activating virtual environment..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        if [ -f ".venv/Scripts/activate" ]; then
            source .venv/Scripts/activate
            log_success "✅ Virtual environment activated (Windows)."
        else
            log_error "❌ Virtual environment activation script not found at .venv/Scripts/activate"
            exit 1
        fi
    else
        if [ -f ".venv/bin/activate" ]; then
            source .venv/bin/activate
            log_success "✅ Virtual environment activated (Unix/Linux)."
        else
            log_error "❌ Virtual environment activation script not found at .venv/bin/activate"
            exit 1
        fi
    fi

    # Python dependency installation from setup.sh
    run_cmd "uv pip install -r py/requirements.txt" "📥 Installing Python dependencies"

    # Node.js dependency installation from setup.sh (updated path for flattened structure)
    log_info "📥 Installing Node.js dependencies..."
    run_cmd "npm install --prefix js" "Installing JavaScript dependencies (updated for flattened structure)"

    log_success "✅ Setup complete! You can now run the application using ./run.sh"
}

# Development command (enhanced with dev.sh functionality)
cmd_dev() {
    log_info "🚀 Starting DearReader development environment..."

    # Check Docker availability first
    if ! command -v docker >/dev/null 2>&1; then
        log_error "❌ docker command not found. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "❌ docker-compose command not found. Please install Docker Compose."
        exit 1
    fi

    # Tearing down any existing 'reader' environment (from dev.sh)
    run_cmd "docker-compose down --remove-orphans" "Tearing down any existing 'reader' environment"

    # Starting DEVELOPMENT environment (from dev.sh)
    run_cmd "docker-compose --profile dev up --build -d" "Starting DEVELOPMENT environment (JS + Python)"

    log_success "Development environment started!"
    log_info "Services running. To view logs, run './run.sh dev --logs' or 'docker-compose logs -f js-functions python'"
}

# Test commands
cmd_test() {
    local test_type="${1:-all}"
    log_info "🧪 Running DearReader tests (${test_type})..."

    case "$test_type" in
        js)
            run_cmd "docker-compose --profile dev run --rm js-test" "Running JavaScript tests"
            ;;
        python)
            log_info "Running Python tests only..."
            if command -v uv >/dev/null 2>&1; then
                if [ "$VERBOSE" = true ]; then
                    run_cmd "uv run py/app.py tests --verbose" "Running Python tests with live output"
                else
                    uv run py/app.py tests --verbose
                fi
            else
                log_error "uv not found. Please run setup first or install uv"
                exit 1
            fi
            ;;
        all)
            local failed=false

            if ! run_cmd "docker-compose --profile dev run --rm js-test" "Running JavaScript tests"; then
                log_error "JavaScript tests failed"
                failed=true
                [ "$FORCE" != true ] && exit 1
            fi

            if command -v uv >/dev/null 2>&1; then
                if ! run_cmd "uv run py/app.py tests --verbose" "Running Python tests"; then
                    log_error "Python tests failed"
                    failed=true
                    [ "$FORCE" != true ] && exit 1
                fi
            else
                log_error "uv not found. Skipping Python tests."
                failed=true
            fi

            if [ "$failed" = false ]; then
                log_success "✅ All tests passed!"
            else
                [ "$FORCE" = true ] && log_warn "Some tests failed but --force was used"
            fi
            ;;
        *)
            log_error "Unknown test type: $test_type"
            echo "Available: js, python, all"
            exit 1
            ;;
    esac
}

# Run command
cmd_run() {
    local env="${1:-dev}"
    log_info "🚀 Starting DearReader (${env} environment)..."

    case "$env" in
        dev)
            # Start development profile in background, tail logs
            run_cmd "docker-compose down --remove-orphans" "Cleaning up existing Docker containers"
            run_cmd "docker-compose --profile dev up --build -d" "Starting development Docker environment"
            log_success "Development environment started in background"

            log_info "Tailing development logs (Ctrl+C to exit)..."
            docker-compose logs -f js-functions python # Always show logs for dev
            ;;
        prod)
            run_cmd "docker-compose down --remove-orphans" "Cleaning up existing Docker containers"
            run_cmd "docker-compose --profile prod up --build -d" "Starting production Docker environment"
            log_success "Production server started in background"

            log_info "Tailing production logs (Ctrl+C to exit)..."
            docker-compose logs -f server # Always show logs for prod
            ;;
        *)
            log_error "Unknown environment: $env"
            echo "Available: dev, prod"
            exit 1
            ;;
    esac
}

# Stop command
cmd_stop() {
    log_info "🛑 Stopping all DearReader services..."
    run_cmd "docker-compose down --remove-orphans" "Stopping Docker containers"
    log_success "✅ All services stopped!"
}

# Main logic
main() {
    local command="$1"
    shift || true

    # Parse verbose and force flags early
    VERBOSE=false
    FORCE=false

    # Re-parse arguments to separate flags from commands/subcommands
    local args_without_flags=()
    for arg in "$@"; do
        case "$arg" in
            --verbose) VERBOSE=true ;;
            --force) FORCE=true ;;
            *) args_without_flags+=("$arg") ;;
        esac
    done
    set -- "${args_without_flags[@]}" # Reset positional parameters to only command/subcommand arguments

    # Handle commands
    case "$command" in
        setup)
            cmd_setup
            ;;
        dev)
            cmd_dev
            ;;
        test)
            test_type="${1:-all}"
            [ "$test_type" = "js" ] || [ "$test_type" = "python" ] || [ "$test_type" = "all" ] || test_type="all"
            cmd_test "$test_type"
            ;;
        run)
            env_type="${1:-dev}"
            [ "$env_type" = "dev" ] || [ "$env_type" = "prod" ] || env_type="dev"
            cmd_run "$env_type"
            ;;
        stop)
            cmd_stop
            ;;
        --help|help|"")
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main with all arguments
main "$@"
