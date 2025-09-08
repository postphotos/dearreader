#!/usr/bin/env python3
"""
Unified DearReader App Runner and Pipeline Manager

This script automates the complete development and testing pipeline for the DearReader
project. It handles npm dependencies, Docker builds, static analysis, and runs
integration and performance tests.

Usage:
    All commands can be run with 'uv run py/app.py <command>' or './run.sh <command>'.

Available Commands:
    start / basic    - (Default) Runs core checks: npm, pyright, and the demo
    all              - Runs the full pipeline: npm, docker, pyright, demo, speedtest
    tests            - Runs all available tests: npm, TypeScript build, demo, etc
    npm              - Only runs 'npm install' and 'npm test'
    docker           - Builds and runs the Docker container
    docker-clear     - Clears Docker cache, then builds and runs the container
    pyright          - Runs the Pyright static type checker
    demo             - Runs the demo.py integration test script
    speedtest        - Runs the speedtest.py performance script
    stop             - Stops and removes the running Docker container
    js-test          - Runs JavaScript tests via docker-compose
    prod-up          - Starts production environment via docker-compose

Options:
    --verbose        - Shows live output from commands instead of capturing it
    --debug          - If 'npm test' times out, re-runs it with no time limit
    --force          - Continues the pipeline even if some steps fail
    --no-cache       - Disables the Docker build cache (used with 'docker' command)
"""
import argparse
import os
import shlex
import shutil
import subprocess
import sys
import time
import select
import webbrowser
import yaml as yaml # Add yaml import
import socket
import psutil
from typing import Tuple, Callable, Optional, Dict

# --- Configuration ---
DOCKER_IMAGE_NAME = "reader-app"
DOCKER_CONTAINER_NAME = "reader-instance"
LOG_PREFIX = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}]"

def get_default_url_from_config():
    """Reads the default URL from config.yaml, with a fallback."""
    try:
        with open("config.yaml", "r") as f:
            config = yaml.safe_load(f)
            return config.get("url", "http://localhost:3000")
    except (FileNotFoundError, yaml.YAMLError):
        return "http://localhost:3000"

class Colors:
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    ENDC = "\033[0m"

# --- Logging Functions ---
def print_info(message: str) -> None:
    print(f"{Colors.BLUE}{LOG_PREFIX} [INFO] {message}{Colors.ENDC}")

def print_success(message: str) -> None:
    print(f"{Colors.GREEN}{LOG_PREFIX} [SUCCESS] {message}{Colors.ENDC}")

def print_error(message: str) -> None:
    print(f"{Colors.RED}{LOG_PREFIX} [ERROR] {message}{Colors.ENDC}", file=sys.stderr)

def print_warning(message: str) -> None:
    print(f"{Colors.YELLOW}{LOG_PREFIX} [WARN] {message}{Colors.ENDC}")

# --- Helper for process termination (moved above run_cmd) ---
def _terminate_process_group(proc: subprocess.Popen):
    """Helper to terminate a process and its children, platform-aware."""
    if sys.platform != "win32":
        try:
            os.killpg(os.getpgid(proc.pid), 15)  # SIGTERM
            time.sleep(1)
            os.killpg(os.getpgid(proc.pid), 9)  # SIGKILL
        except ProcessLookupError:
            pass  # Process already finished
        except Exception as e:
            print_error(f"Failed to kill process group: {e}")
    else: # Windows
        try:
            proc.terminate()
            time.sleep(1)
            proc.kill()
        except ProcessLookupError:
            pass  # Process already finished
        except Exception as e:
            print_error(f"Failed to kill process on Windows: {e}")

# --- Core Execution Logic ---
def run_cmd(
    cmd: list, cwd: Optional[str] = None, timeout: Optional[int] = None, live: bool = False
) -> Tuple[int, str, str]:
    """
    Executes a command, captures its output, and handles timeouts gracefully.
    REFACTORED: Now consistently takes a list of arguments for better security and clarity.
    """
    if not isinstance(cmd, list):
        raise TypeError("The 'cmd' argument must be a list of strings.")

    print(f"  └─ Running: {' '.join(shlex.quote(c) for c in cmd)}")

    preexec_fn = os.setsid if sys.platform != "win32" else None

    if live:
        proc = subprocess.Popen(cmd, cwd=cwd, preexec_fn=preexec_fn)
        try:
            proc.wait(timeout=timeout)
            return int(proc.returncode), "", ""
        except subprocess.TimeoutExpired:
            print_warning(f"Command timed out after {timeout}s. Terminating process group...")
            _terminate_process_group(proc)
            return 124, "", ""
    else:
        # Special handling for npm/node commands that might not flush properly
        if cmd and cmd[0] in ['npm', 'node', 'npx']:
            # Use a different approach for Node.js commands
            proc = subprocess.Popen(
                cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                preexec_fn=preexec_fn, env=dict(os.environ, NODE_OPTIONS="--max-old-space-size=4096")
            )
        else:
            proc = subprocess.Popen(
                cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                preexec_fn=preexec_fn
            )

        try:
            # Wait for process to finish first
            proc.wait(timeout=timeout or 180)
            # Small delay to ensure all output is flushed
            time.sleep(0.5)

            out = ""
            err = ""

            if hasattr(select, 'select') and proc.stdout and proc.stderr:
                # Check if data is available to read
                ready, _, _ = select.select([proc.stdout, proc.stderr], [], [], 2.0)
                if proc.stdout in ready:
                    out = proc.stdout.read()
                if proc.stderr in ready:
                    err = proc.stderr.read()
            else:
                # Fallback for systems without select
                out = proc.stdout.read() if proc.stdout else ""
                err = proc.stderr.read() if proc.stderr else ""

            return int(proc.returncode), str(out), str(err)
        except subprocess.TimeoutExpired:
            print_warning(f"Command timed out after {timeout or 180}s. Terminating process group...")
            _terminate_process_group(proc)
            return 124, "", ""
        except Exception:
            # Handle any other exceptions that might occur
            _terminate_process_group(proc)
            return 1, "", ""

def check_port_available(port: int) -> bool:
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(('localhost', port))
            return True
        except OSError:
            return False

def find_process_using_port(port: int) -> Optional[psutil.Process]:
    """Find the process using a specific port."""
    for conn in psutil.net_connections():
        if conn.laddr and conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                return psutil.Process(conn.pid)
            except psutil.NoSuchProcess:
                continue
    return None

def handle_port_conflict(port: int, service_name: str) -> bool:
    """Handle port conflict by offering to kill the conflicting process."""
    print_warning(f"Port {port} is already in use by another process.")

    process = find_process_using_port(port)
    if process:
        try:
            process_name = process.name()
            process_cmd = ' '.join(process.cmdline()[:3]) if process.cmdline() else 'Unknown'
            print_warning(f"Process using port {port}: {process_name} (PID: {process.pid})")
            print_warning(f"Command: {process_cmd}")

            # Auto-kill if it's a known development process
            if any(keyword in process_cmd.lower() for keyword in ['python', 'node', 'npm', 'uv', 'app.py']):
                print_info(f"Found development process. Attempting to terminate it...")
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    print_success(f"Successfully terminated process {process.pid}")
                    time.sleep(2)  # Wait for port to be released
                    return True
                except psutil.TimeoutExpired:
                    print_warning(f"Process {process.pid} didn't terminate gracefully. Force killing...")
                    process.kill()
                    time.sleep(2)
                    return True
                except psutil.NoSuchProcess:
                    print_info(f"Process {process.pid} was already terminated.")
                    time.sleep(1)
                    return True
            else:
                print_error(f"Port {port} is in use by: {process_name}")
                print_info("Please stop this process or choose a different port.")
                return False
        except psutil.NoSuchProcess:
            print_info(f"Process was already terminated.")
            time.sleep(1)
            return True
        except Exception as e:
            print_error(f"Error handling process: {e}")
            return False
    else:
        print_error(f"Port {port} is in use but couldn't identify the process.")
        return False

def ensure_port_available(port: int, service_name: str) -> bool:
    """Ensure a port is available, handling conflicts automatically."""
    if check_port_available(port):
        return True

    print_info(f"Checking port {port} availability for {service_name}...")
    return handle_port_conflict(port, service_name)

def step_npm(verbose: bool = False, debug: bool = False) -> int:
    """Run npm install and test."""
    print_info("--- Step 1: Running npm install and tests ---")
    npm_dir = "js"

    print_info("Installing npm dependencies...")
    code, out, err = run_cmd(["npm", "install"], cwd=npm_dir, timeout=300, live=verbose)
    if code != 0:
        print_error("npm install failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("Dependencies installed.")

    print_info("Running npm tests...")
    code, out, err = run_cmd(["npm", "test"], cwd=npm_dir, timeout=45, live=verbose)

    # Debug: Print some info about what we got back
    if not verbose:
        print_info(f"npm test completed with exit code: {code}")
        if out:
            print_info(f"Captured {len(out)} characters of stdout")
        if err:
            print_info(f"Captured {len(err)} characters of stderr")

    if code == 124:
        print_error("npm tests timed out (45s). This is considered a failure.")
        if debug:
            print_info("Debug mode: re-running tests without timeout to see full output...")
            code, out, err = run_cmd(["npm", "test"], cwd=npm_dir, live=False)
            if err: print(err, file=sys.stderr)
            return code or 1
        return 124
    if code != 0:
        print_error("npm tests failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("NPM tests passed.")
    return 0

def step_docker(verbose: bool = False, clear_cache: bool = False) -> int:
    """REFACTORED: Build and run Docker container with robust cleanup."""
    print_info("--- Step 2: Building and running Docker container ---")

    # Stop and remove any existing container with the same name.
    # This is safer and more targeted than the previous multi-command approach.
    print_info(f"Checking for and stopping existing container '{DOCKER_CONTAINER_NAME}'...")
    run_cmd(["docker", "stop", DOCKER_CONTAINER_NAME], timeout=15)
    run_cmd(["docker", "rm", DOCKER_CONTAINER_NAME], timeout=10)

    if clear_cache:
        print_info("Clearing Docker build cache...")
        run_cmd(["docker", "builder", "prune", "-f"], timeout=60)

    print_info(f"Building Docker image '{DOCKER_IMAGE_NAME}'...")
    build_cmd = ["docker", "build", "-t", DOCKER_IMAGE_NAME, "./docker"]
    if clear_cache:
        build_cmd.insert(2, "--no-cache")

    code, _, err = run_cmd(build_cmd, timeout=300, live=verbose)
    if code != 0:
        print_error("Docker build failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("Docker image built.")

    print_info(f"Running Docker container '{DOCKER_CONTAINER_NAME}'...")

    # Check if port 3000 is available before trying to run the container
    if not ensure_port_available(3000, "Docker container"):
        print_error("Cannot start Docker container due to port conflict.")
        print_info("Try running './run.sh stop' to stop any existing containers, or manually kill the process using port 3000.")
        return 1

    # Handle Windows paths for Docker volume mounting
    storage_path = os.path.abspath('./storage').replace('\\', '/')
    run_cmd_list = [
        "docker", "run", "-d", "--name", DOCKER_CONTAINER_NAME,
        "-p", "3000:3000",
        "-v", f"{storage_path}:/app/local-storage",
        DOCKER_IMAGE_NAME
    ]
    code, _, err = run_cmd(run_cmd_list, timeout=30, live=verbose)
    if code != 0:
        print_error("Docker run failed.")
        if err and not verbose: print(err, file=sys.stderr)
        if err and ("port is already allocated" in err or "Bind for 0.0.0.0:3000 failed" in err):
            print_warning("Port 3000 may be in use by another process. Please check and try again.")
        return code

    print_info("Waiting 5 seconds for the container to initialize...")
    time.sleep(5)
    print_success(f"Container '{DOCKER_CONTAINER_NAME}' is running on port 3000.")
    return 0

def step_pyright(verbose: bool = False) -> int:
    """Run pyright type checking."""
    print_info("--- Step 3: Running Pyright static type checker ---")
    if shutil.which("pyright") is None:
        print_warning("pyright not found; skipping. Install with 'uv pip install pyright'.")
        return 0

    code, _, err = run_cmd(["pyright"], timeout=30, live=verbose)
    if code != 0:
        print_error("Pyright checks failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("Pyright checks passed.")
    return 0

def step_demo(verbose: bool = False) -> int:
    """Run demo.py."""
    print_info("--- Step 4: Running demo.py ---")
    if not os.path.exists("py/demo.py"):
        print_warning("py/demo.py not found; skipping.")
        return 0

    cmd = ["python", "py/demo.py"]
    code, _, err = run_cmd(cmd, timeout=30, live=verbose)
    if code != 0:
        print_error("demo.py failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("Demo script executed successfully.")
    return 0

def step_speedtest(verbose: bool = False) -> int:
    """Run speed test."""
    print_info("--- Step 5: Running DearReader Speed Test ---")
    if not os.path.exists("py/speedtest.py"):
        print_warning("py/speedtest.py not found; skipping.")
        return 0

    cmd = ["python", "py/speedtest.py"]
    code, _, err = run_cmd(cmd, timeout=60, live=verbose)
    if code != 0:
        print_error("Speed test failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("Speed test completed.")
    return 0
def step_stop(verbose: bool = False) -> int:
    """REFACTORED: Stop and remove the Docker container using its name for reliability."""
    print_info(f"--- Stopping container '{DOCKER_CONTAINER_NAME}' ---")

    # This is much more reliable than parsing 'docker ps' output.
    code_stop, _, _ = run_cmd(["docker", "stop", DOCKER_CONTAINER_NAME], timeout=15, live=verbose)
    code_rm, _, _ = run_cmd(["docker", "rm", DOCKER_CONTAINER_NAME], timeout=10, live=verbose)

    if code_stop == 0 or code_rm == 0:
        print_success(f"Container '{DOCKER_CONTAINER_NAME}' stopped and removed.")
    else:
        print_info(f"Container '{DOCKER_CONTAINER_NAME}' was not running or could not be removed.")
    return 0

def step_js_test(verbose: bool = False) -> int:
    """Run JavaScript tests via docker-compose."""
    print_info("--- Running JavaScript tests ---")

    # Check if ports 3000 and 5000 are available (used by js-server and python services)
    if not ensure_port_available(3000, "JS server"):
        print_error("Cannot run JS tests - port 3000 is in use.")
        return 1

    if not ensure_port_available(5000, "Python service"):
        print_error("Cannot run JS tests - port 5000 is in use.")
        return 1

    code, _, err = run_cmd(["docker-compose", "--profile", "dev", "run", "--rm", "js-test"], timeout=300, live=verbose)
    if code != 0:
        print_error("JavaScript tests failed.")
        if err and not verbose: print(err, file=sys.stderr)
        return code
    print_success("JavaScript tests passed.")
    return 0

def step_prod_up(verbose: bool = False) -> int:
    """Start production environment via docker-compose."""
    print_info("--- Starting PRODUCTION environment ---")

    # Check if port 80 is available (used by the server service)
    if not ensure_port_available(80, "Production server"):
        print_error("Cannot start production - port 80 is in use.")
        return 1

    print_info("Stopping any existing services...")
    run_cmd(["docker-compose", "down", "--remove-orphans"], timeout=60)

    print_info("Building and starting production services...")
    code, _, err = run_cmd(["docker-compose", "--profile", "prod", "up", "--build", "-d"], timeout=600, live=verbose)
    if code != 0:
        print_error("Failed to start production environment.")
        if err and not verbose: print(err, file=sys.stderr)
        return code

    print_success("Production environment started.")
    print_info("Tailing logs... (Press Ctrl+C to stop)")
    # Start tailing logs in the background
    try:
        run_cmd(["docker-compose", "logs", "-f", "server"], live=True)
    except KeyboardInterrupt:
        print_info("Stopping log tail...")
    return 0

def step_tests(verbose: bool = False, debug: bool = False, force: bool = False) -> int:
    """Run ALL tests: npm, TypeScript build, pyright, demo, and speedtest."""
    print_info("--- Running ALL available tests ---")

    pipeline_steps = {
        "npm": lambda: step_npm(debug=debug, verbose=verbose),
        "TypeScript Build": lambda: run_cmd(["npm", "run", "build"], cwd="js", timeout=60)[0],
        "pyright": lambda: step_pyright(verbose=verbose),
        "Start Docker for tests": lambda: step_docker(verbose=verbose),
        "demo": lambda: step_demo(verbose=verbose),
        "speedtest": lambda: step_speedtest(verbose=verbose),
    }

    results = run_pipeline(pipeline_steps, force)

    if all(code == 0 for code in results.values()):
        print_success("✅✅✅ ALL tests passed successfully! ✅✅✅")
        return 0
    else:
        print_error("Some tests failed.")
        return 1

# --- Main Application Logic ---
def run_pipeline(pipeline_steps: Dict[str, Callable], force: bool) -> Dict[str, int]:
    """NEW: Generic function to run a pipeline of steps."""
    results = {}
    for name, step_func in pipeline_steps.items():
        rc = step_func()
        results[name] = rc
        if rc != 0:
            print_error(f"Pipeline failed at step: '{name}' (exit code {rc}).")
            if not force:
                return results
            else:
                print_warning(f"'--force' is active. Continuing to next step...")
    return results

def main():
    # Get default URL from config before parsing args
    default_url = get_default_url_from_config()

    parser = argparse.ArgumentParser(
        description="Unified DearReader test runner and pipeline manager.",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="start",
        choices=["basic", "start", "all", "npm", "docker", "docker-clear", "pyright", "demo", "speedtest", "tests", "stop", "js-test", "prod-up"],
        help="Command to run (default: start). See docstring for details."
    )
    parser.add_argument("--verbose", action="store_true", help="Show live command output.")
    parser.add_argument("--debug", action="store_true", help="Re-run failed npm tests without timeout for detailed output.")
    parser.add_argument("--force", action="store_true", help="Continue pipeline even if some steps fail.")
    parser.add_argument("--no-cache", dest="no_cache", action="store_true", help="Disable Docker build cache.")
    parser.add_argument("--url", default=default_url, help=f"URL to open on success (default: {default_url})")

    args = parser.parse_args()

    # Change to the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(os.path.join(script_dir, ".."))

    try:
        if shutil.which("docker") is None or shutil.which("npm") is None:
            print_error("Missing required tools: 'docker' and 'npm' must be in your PATH.")
            return 2

        final_rc = 0
        if args.command == "npm":
            final_rc = step_npm(debug=args.debug, verbose=args.verbose)
        elif args.command == "docker":
            final_rc = step_docker(verbose=args.verbose, clear_cache=args.no_cache)
        elif args.command == "docker-clear":
            final_rc = step_docker(verbose=args.verbose, clear_cache=True)
        elif args.command == "pyright":
            final_rc = step_pyright(verbose=args.verbose)
        elif args.command == "demo":
            final_rc = step_demo(verbose=args.verbose)
        elif args.command == "speedtest":
            final_rc = step_speedtest(verbose=args.verbose)
        elif args.command == "stop":
            final_rc = step_stop(verbose=args.verbose)
        elif args.command == "js-test":
            final_rc = step_js_test(verbose=args.verbose)
        elif args.command == "prod-up":
            final_rc = step_prod_up(verbose=args.verbose)
        elif args.command == "tests":
            final_rc = step_tests(verbose=args.verbose, debug=args.debug, force=args.force)

        elif args.command in ["start", "basic", "all"]:
            pipelines = {
                "start": {
                    "npm": lambda: step_npm(debug=args.debug, verbose=args.verbose),
                    "pyright": lambda: step_pyright(verbose=args.verbose),
                    "demo": lambda: step_demo(verbose=args.verbose)
                },
                "basic": {
                    "npm": lambda: step_npm(debug=args.debug, verbose=args.verbose),
                    "pyright": lambda: step_pyright(verbose=args.verbose),
                    "demo": lambda: step_demo(verbose=args.verbose)
                },
                "all": {
                    "npm": lambda: step_npm(debug=args.debug, verbose=args.verbose),
                    "docker": lambda: step_docker(verbose=args.verbose, clear_cache=args.no_cache),
                    "pyright": lambda: step_pyright(verbose=args.verbose),
                    "demo": lambda: step_demo(verbose=args.verbose),
                    "speedtest": lambda: step_speedtest(verbose=args.verbose)
                }
            }

            print_info(f"🚀 Starting the '{args.command}' pipeline...")
            results = run_pipeline(pipelines[args.command], args.force)

            # --- Final Summary ---
            print_info("--- Pipeline Summary ---")
            all_passed = True
            for name, code in results.items():
                if code == 0:
                    print_success(f"✅ {name}: Passed")
                else:
                    print_error(f"❌ {name}: Failed (exit code {code})")
                    all_passed = False

            if all_passed:
                print_success("✅✅✅ Pipeline completed successfully! ✅✅✅")
                if args.command == "all":
                     print_info(f"Container is running. To stop it later, run: uv run app.py stop")
                     # Open the browser to the configured URL
                     print_info(f"Opening browser at {args.url}")
                     webbrowser.open(args.url)
            else:
                final_rc = 1

        return final_rc

    except KeyboardInterrupt:
        print("\nInterrupted by user.", file=sys.stderr)
        return 130
    except Exception as e:
        print_error(f"An unexpected error occurred: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())