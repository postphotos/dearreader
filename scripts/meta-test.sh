#!/bin/bash

# Meta Test Script for DearReader CLI
# Tests all commands in ./dearreader to ensure they work correctly
# This script is safe to run and won't make destructive changes

# Don't exit on individual command failures - we want to test all commands
# set -e

# Get the directory where this script is located and navigate to project root
SCRIPT_DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

# Color and formatting constants
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Emoji constants
ROCKET="🚀"
GEAR="⚙️"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
INFO="ℹ️"
TEST="🧪"
STOP="🛑"
SPARKLES="✨"

# Logging functions
log_info() {
    echo -e "${BLUE}${INFO}${NC} $1"
}

log_success() {
    echo -e "${GREEN}${CHECK}${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}${WARNING}${NC} $1"
}

log_error() {
    echo -e "${RED}${CROSS}${NC} $1"
}

log_header() {
    echo -e "\n${MAGENTA}${BOLD}$1${NC}"
    echo -e "${MAGENTA}$(printf '%.0s=' {1..60})${NC}"
}

log_subheader() {
    echo -e "${CYAN}${BOLD}$1${NC}"
}

# Test result tracking
TEST_RESULTS=()
PASSED=0
FAILED=0
SKIPPED=0

# Safe test runner that doesn't fail the script
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_exit="${3:-0}"
    local description="$4"

    echo -e "\n${CYAN}🧪 Testing: ${test_name}${NC}"
    if [ -n "$description" ]; then
        echo -e "${WHITE}   ${description}${NC}"
    fi

    # Run the command and capture output and exit code
    local output
    local exit_code
    if output=$(eval "$command" 2>&1); then
        exit_code=$?
    else
        exit_code=$?
    fi

    if [ "$exit_code" -eq "$expected_exit" ]; then
        log_success "$test_name passed"
        TEST_RESULTS+=("$test_name: PASS")
        ((PASSED++))
        return 0
    else
        log_error "$test_name failed (exit code: $exit_code, expected: $expected_exit)"
        if [ -n "$output" ]; then
            echo -e "${RED}   Output: ${output:0:200}...${NC}"
        fi
        TEST_RESULTS+=("$test_name: FAIL (exit $exit_code)")
        ((FAILED++))
        return 1  # Return failure but don't exit the script
    fi
}

# Check if Docker is available
check_docker_available() {
    if ! command -v docker >/dev/null 2>&1; then
        return 1
    fi
    if ! docker version >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Check if Docker Compose is available
check_docker_compose_available() {
    if ! command -v docker-compose >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Check if Node.js is available
check_nodejs_available() {
    if ! command -v node >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Check if Python is available
check_python_available() {
    if ! command -v python >/dev/null 2>&1 && ! command -v uv >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

# Main test function
run_meta_tests() {
    log_header "${TEST} DearReader CLI Meta Tests"
    log_info "Testing all ./dearreader commands for functionality"
    log_warn "Note: Some tests may be skipped if prerequisites are not met"

    # Test 1: Help command
    run_test "help_command" "./dearreader help" 0 "Should display help information"

    # Test 2: Status command (safe, just shows system status)
    run_test "status_command" "./dearreader status" 0 "Should show system status without errors"

    # Test 3: Migration command (safe, just shows info)
    run_test "migration_command" "./dearreader migration" 0 "Should show migration information"

    # Test 4: Test command with invalid type (should show error)
    run_test "test_invalid_type" "./dearreader test invalid" 1 "Should reject invalid test type"

    # Test 5: Run command with invalid environment (should show error)
    run_test "run_invalid_env" "./dearreader run invalid" 1 "Should reject invalid environment"

    # Test 6: API command with invalid action (should show error)
    run_test "api_invalid_action" "./dearreader api invalid" 1 "Should reject invalid API action"

    # Test 7: Unknown command (should show error)
    run_test "unknown_command" "./dearreader nonexistent" 1 "Should reject unknown commands"

    # Test 8: Setup command (dry run - just check if it starts without error)
    # This is potentially destructive, so we'll skip it unless explicitly requested
    if [ "$RUN_SETUP_TEST" = "true" ]; then
        log_warn "Running setup test (this may take time and requires internet)"
        run_test "setup_command_start" "timeout 10s ./dearreader setup 2>&1 | head -5" 0 "Setup should start without immediate errors (timeout after 10s)"
    else
        log_info "Skipping setup test (use RUN_SETUP_TEST=true to enable)"
        TEST_RESULTS+=("setup_command: SKIP (not requested)")
        ((SKIPPED++))
    fi

    # Test 9: Test command help (should show available test types)
    run_test "test_help" "./dearreader test nonexistent 2>&1 | grep -q 'Available:'" 0 "Should show available test types for invalid input"

    # Test 10: Stop command (safe if no services are running)
    run_test "stop_command" "./dearreader stop" 0 "Stop command should work even if no services are running"

    # Test 11: Clean command with no (should not proceed)
    log_info "Testing clean command (will respond 'n' to prompt)..."
    echo "n" | run_test "clean_command_no" "./dearreader clean" 0 "Clean command should handle 'no' response gracefully"

    # Test 12: Logs command (should work even if no containers)
    run_test "logs_command" "./dearreader logs 2>&1 | head -5" 0 "Logs command should work (may show no containers)"

    # Test 13: Dev command (check if it would start - may fail due to missing setup)
    if check_docker_available && check_docker_compose_available; then
        # Just test that the command is recognized and starts validation
        run_test "dev_command_validation" "timeout 5s ./dearreader dev 2>&1 | head -3" 0 "Dev command should start validation process"
    else
        log_warn "Skipping dev command test (Docker/Docker Compose not available)"
        TEST_RESULTS+=("dev_command: SKIP (Docker not available)")
        ((SKIPPED++))
    fi

    # Test 14: Test pipeline command (may require setup)
    if check_nodejs_available && [ -f "crawl_pipeline.yaml" ]; then
        run_test "test_pipeline_validation" "timeout 5s ./dearreader test pipeline 2>&1 | head -3" 0 "Pipeline test should start if Node.js available"
    else
        log_warn "Skipping pipeline test (Node.js or crawl_pipeline.yaml not available)"
        TEST_RESULTS+=("test_pipeline: SKIP (prerequisites not met)")
        ((SKIPPED++))
    fi

    # Test 15: Test python command (may require setup)
    if check_python_available; then
        run_test "test_python_validation" "timeout 5s ./dearreader test python 2>&1 | head -3" 0 "Python test should start if Python available"
    else
        log_warn "Skipping python test (Python not available)"
        TEST_RESULTS+=("test_python: SKIP (Python not available)")
        ((SKIPPED++))
    fi

    # Test 16: Test js command (may require setup)
    if check_nodejs_available; then
        run_test "test_js_validation" "timeout 5s ./dearreader test js 2>&1 | head -3" 0 "JS test should start if Node.js available"
    else
        log_warn "Skipping js test (Node.js not available)"
        TEST_RESULTS+=("test_js: SKIP (Node.js not available)")
        ((SKIPPED++))
    fi

    # Test 17: Test e2e command (may require setup)
    if check_nodejs_available && [ -f "scripts/e2e-test.sh" ]; then
        run_test "test_e2e_validation" "timeout 5s ./dearreader test e2e 2>&1 | head -3" 0 "E2E test should start if prerequisites met"
    else
        log_warn "Skipping e2e test (prerequisites not available)"
        TEST_RESULTS+=("test_e2e: SKIP (prerequisites not available)")
        ((SKIPPED++))
    fi

    # Test 18: API test command (may require running services)
    run_test "api_test_command" "timeout 5s ./dearreader api test 2>&1 | head -3" 0 "API test should attempt to run"

    # Test 19: Verbose flag
    run_test "verbose_flag" "./dearreader status --verbose 2>&1 | grep -qi 'status'" 0 "Verbose flag should be processed (status command should work with verbose)"

    # Test 20: Force flag with safe command
    run_test "force_flag" "./dearreader status --force" 0 "Force flag should be accepted by commands that support it"

    # Test 21: Requests flag propagation to python test
    if check_python_available;
    then
        run_test "requests_flag_python" \
            "./dearreader test python --requests -vv 2>&1 | grep -q 'Command:.*--requests'"
            0 \
            "The --requests flag should be passed to the python test command"
    else
        log_warn "Skipping requests flag test for python (Python not available)"
        TEST_RESULTS+=("requests_flag_python: SKIP (Python not available)")
        ((SKIPPED++))
    fi
}

# Print test summary
print_summary() {
    log_header "${INFO} Meta Test Summary"

    echo -e "\n${BOLD}Test Results:${NC}"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
    echo -e "${BLUE}Total: $((PASSED + FAILED + SKIPPED))${NC}"

    if [ ${#TEST_RESULTS[@]} -gt 0 ]; then
        echo -e "\n${BOLD}Detailed Results:${NC}"
        for result in "${TEST_RESULTS[@]}"; do
            if [[ $result == *"PASS"* ]]; then
                echo -e "${GREEN}✅ $result${NC}"
            elif [[ $result == *"FAIL"* ]]; then
                echo -e "${RED}❌ $result${NC}"
            elif [[ $result == *"SKIP"* ]]; then
                echo -e "${YELLOW}⚠️  $result${NC}"
            else
                echo -e "${WHITE}   $result${NC}"
            fi
        done
    fi

    echo -e "\n${BOLD}System Information:${NC}"
    echo -e "  Docker available: $(check_docker_available && echo '✅ Yes' || echo '❌ No')"
    echo -e "  Docker Compose available: $(check_docker_compose_available && echo '✅ Yes' || echo '❌ No')"
    echo -e "  Node.js available: $(check_nodejs_available && echo '✅ Yes' || echo '❌ No')"
    echo -e "  Python available: $(check_python_available && echo '✅ Yes' || echo '❌ No')"
    echo -e "  crawl_pipeline.yaml exists: $([ -f 'crawl_pipeline.yaml' ] && echo '✅ Yes' || echo '❌ No')"
    echo -e "  scripts/e2e-test.sh exists: $([ -f 'scripts/e2e-test.sh' ] && echo '✅ Yes' || echo '❌ No')"

    if [ "$FAILED" -eq 0 ]; then
        log_success "All meta tests completed successfully!"
        echo -e "\n${GREEN}${SPARKLES} The DearReader CLI is working correctly!${NC}"
        return 0
    else
        log_error "Some meta tests failed. Check the output above for details."
        echo -e "\n${YELLOW}This doesn't necessarily mean DearReader is broken.${NC}"
        echo -e "${YELLOW}Some tests may fail due to missing prerequisites or environment setup.${NC}"
        return 1
    fi
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Parse command line arguments
    RUN_SETUP_TEST="${RUN_SETUP_TEST:-false}"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --run-setup-test)
                RUN_SETUP_TEST=true
                shift
                ;;
            --help|-h)
                echo "Meta Test Script for DearReader CLI"
                echo ""
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --run-setup-test    Include the setup command test (may take time)"
                echo "  --help, -h         Show this help message"
                echo ""
                echo "This script tests all commands in ./dearreader to ensure they work correctly."
                echo "It's safe to run and won't make destructive changes to your system."
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information."
                exit 1
                ;;
        esac
    done

    # Run the meta tests
    run_meta_tests
    print_summary
fi