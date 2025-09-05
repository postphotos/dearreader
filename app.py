#!/usr/bin/env python3
"""Unified DearReader app runner and pipeline manager

This script runs the complete development pipeline: npm install/test, docker build/run,
pyright checks, and demo.py execution.

Usage:
    uv run app.py [--verbose] [--debug]        # Run basic npm/pyright/demo pipeline (same as 'start')
    uv run app.py start                        # Same as running with no arguments
    uv run app.py all                          # Run full pipeline including docker
    uv run app.py npm                          # Just npm install and test
    uv run app.py docker                       # Just docker build and run
    uv run app.py docker-clear                 # Docker build with cache cleared
    uv run app.py pyright                      # Just pyright check
    uv run app.py demo                         # Just demo.py
    uv run app.py speedtest                    # Just speedtest.py
    uv run app.py tests                        # Run ALL tests (npm + TypeScript + pyright + demo + speedtest)
    uv run app.py stop                         # Stop the Docker container
    uv run app.py --no-cache docker            # Pass --no-cache to disable Docker build cache
"""

import os
import shutil
import signal
import subprocess
import sys
import time
from typing import Optional, Tuple

# Configuration
DOCKER_IMAGE_NAME = "reader-app"
DOCKER_CONTAINER_NAME = "reader-instance"
NPM_DIR = "./backend/functions"


def log(msg: str) -> None:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def print_info(message: str) -> None:
        print(f"\033[94m[INFO] {message}\033[0m")


def print_success(message: str) -> None:
        print(f"\033[92m[SUCCESS] {message}\033[0m")


def print_error(message: str) -> None:
        print(f"\033[91m[ERROR] {message}\033[0m", file=sys.stderr)


def run_cmd(cmd, cwd: Optional[str] = None, timeout: Optional[int] = None, live: bool = False) -> Tuple[int, str, str]:
        """Run command. If timeout expires, kill the whole process group."""
        if isinstance(cmd, (list, tuple)):
                popen_cmd = cmd
                shell = False
        else:
                popen_cmd = cmd
                shell = True

        preexec_fn = os.setsid if hasattr(os, "setsid") else None

        if live:
                proc = subprocess.Popen(popen_cmd, cwd=cwd, shell=shell, preexec_fn=preexec_fn)
                try:
                        proc.wait(timeout=timeout)
                        return proc.returncode, "", ""
                except subprocess.TimeoutExpired:
                        try:
                                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                        except Exception:
                                pass
                        time.sleep(1)
                        try:
                                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                        except Exception:
                                pass
                        return 124, "", ""

        proc = subprocess.Popen(popen_cmd, cwd=cwd, shell=shell, stdout=subprocess.PIPE, stderr=subprocess.PIPE, preexec_fn=preexec_fn, text=True)
        try:
                out, err = proc.communicate(timeout=timeout)
                return proc.returncode, out, err
        except subprocess.TimeoutExpired:
                try:
                        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                except Exception:
                        pass
                time.sleep(1)
                try:
                        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                except Exception:
                        pass
                out, err = proc.communicate(timeout=5)
                return 124, out, err


def check_tools(names):
        missing = [n for n in names if shutil.which(n) is None]
        return missing


def ensure_venv():
        """Check if we're in a virtual environment."""
        venv_dir = os.path.join(os.getcwd(), ".venv")
        if os.path.exists(os.path.join(venv_dir, "bin", "activate")):
                if not os.environ.get("VIRTUAL_ENV"):
                        print_info(f"Virtual environment detected at {venv_dir}")
                        print_info("Tip: Run with 'source .venv/bin/activate && uv run app.py' or similar")


def step_npm(debug: bool = False, verbose: bool = False) -> int:
        """Run npm install and test."""
        npm_dir = NPM_DIR if os.path.isdir(NPM_DIR) else "."

        print_info("--- Step 1: Running npm install and tests ---")
        print_info(f"Using npm directory: {npm_dir}")

        # npm install
        print_info("Running npm install...")
        code, out, err = run_cmd(["npm", "install"], cwd=npm_dir, timeout=300, live=verbose)
        if code != 0:
                print_error(f"npm install failed (code={code})")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)
                return code
        print_success("Dependencies installed successfully")

        # npm test with timeout
        print_info("Running npm test...")
        code, out, err = run_cmd(["npm", "test"], cwd=npm_dir, timeout=5, live=verbose)
        if code == 124:
                print_error("npm tests exceeded timeout (5s / 5000ms) — considered too long")
                if debug:
                        print_info("Debug mode: re-running npm test without timeout...")
                        code2, out2, err2 = run_cmd(["npm", "test"], cwd=npm_dir, timeout=None, live=False)
                        if out2:
                                print(out2)
                        if err2:
                                print(err2, file=sys.stderr)
                        return code2 or 1
                else:
                        print_info("Not in debug mode; skipping debug re-run. Use --debug to re-run without timeout.")
                        return 124
        if code != 0:
                print_error(f"npm tests failed (code={code}); re-running to capture output")
                code2, out2, err2 = run_cmd(["npm", "test"], cwd=npm_dir, timeout=None, live=False)
                if out2:
                        print(out2)
                if err2:
                        print(err2, file=sys.stderr)
                return code2
        print_success("NPM tests passed")
        return 0


def step_docker(verbose: bool = False, clear_cache: bool = False) -> int:
        """Build and run docker container."""
        print_info("--- Step 2: Building and running Docker container ---")

        # Clean up existing container
        print_info("Cleaning up existing containers...")
        subprocess.run(f"docker stop {DOCKER_CONTAINER_NAME}", shell=True, capture_output=True)
        subprocess.run(f"docker rm {DOCKER_CONTAINER_NAME}", shell=True, capture_output=True)

        # Additional cleanup: kill any containers that might be using our image
        print_info("Performing additional cleanup...")
        # Kill containers with exact image name
        subprocess.run(f"docker kill $(docker ps -q --filter ancestor={DOCKER_IMAGE_NAME}) 2>/dev/null || true", shell=True, capture_output=True)
        # Kill containers with "reader" in the image name (catch-all for reader-app, reader, etc.)
        subprocess.run("docker kill $(docker ps -q --filter ancestor=reader) 2>/dev/null || true", shell=True, capture_output=True)
        # Kill containers with "reader" in the container name
        subprocess.run("docker kill $(docker ps -q --filter name=reader) 2>/dev/null || true", shell=True, capture_output=True)

        # Also kill any containers using port 3000 (most important!)
        subprocess.run("docker kill $(docker ps -q --filter publish=3000) 2>/dev/null || true", shell=True, capture_output=True)

        # Remove stopped containers
        subprocess.run(f"docker rm $(docker ps -aq --filter ancestor={DOCKER_IMAGE_NAME}) 2>/dev/null || true", shell=True, capture_output=True)
        subprocess.run("docker rm $(docker ps -aq --filter ancestor=reader) 2>/dev/null || true", shell=True, capture_output=True)
        subprocess.run("docker rm $(docker ps -aq --filter name=reader) 2>/dev/null || true", shell=True, capture_output=True)
        subprocess.run("docker rm $(docker ps -aq --filter publish=3000) 2>/dev/null || true", shell=True, capture_output=True)        # Clear Docker cache if requested
        if clear_cache:
                print_info("Clearing Docker build cache...")
                subprocess.run("docker builder prune -f", shell=True, capture_output=True)
                print_info("Docker cache cleared")

        # Build image
        print_info(f"Building Docker image '{DOCKER_IMAGE_NAME}'...")
        build_cmd = f"docker build -t {DOCKER_IMAGE_NAME} ."
        if clear_cache:
                build_cmd = f"docker build --no-cache -t {DOCKER_IMAGE_NAME} ."

        code, out, err = run_cmd(build_cmd, timeout=600, live=verbose)
        if code != 0:
                print_error(f"Docker build failed (code={code})")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)
                return code
        print_success("Docker image built successfully")

        # Run container
        print_info(f"Running Docker container '{DOCKER_CONTAINER_NAME}'...")
        run_cmd_str = f"docker run -d --name {DOCKER_CONTAINER_NAME} -p 3000:3000 -v ./storage:/app/local-storage {DOCKER_IMAGE_NAME}"
        code, out, err = run_cmd(run_cmd_str, timeout=30, live=verbose)
        if code != 0:
                print_error(f"Docker run failed (code={code})")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)

                # Self-healing: Check for port conflicts and clean up
                port_conflict = False
                if err and ("port is already allocated" in err or "Bind for 0.0.0.0:3000 failed" in err or "failed to set up container networking" in err):
                        port_conflict = True
                        print_info("🔧 Detected port 3000 conflict, attempting self-healing...")

                        # Most aggressive approach: Kill ALL containers using port 3000
                        print_info("🔥 Using aggressive cleanup - killing ALL containers using port 3000...")

                        # Get all container IDs using port 3000
                        port_cmd = "docker ps --filter publish=3000 --format '{{.ID}}' 2>/dev/null"
                        pc_code, pc_out, pc_err = run_cmd(port_cmd, timeout=5, live=False)

                        if pc_code == 0 and pc_out and pc_out.strip():
                                container_ids = pc_out.strip().split('\n')
                                print_info(f"Found {len(container_ids)} container(s) using port 3000")

                                for container_id in container_ids:
                                        if container_id.strip():
                                                print_info(f"Force killing container {container_id.strip()[:12]}...")
                                                # Try kill first, then force kill if needed
                                                run_cmd(f"docker kill {container_id.strip()} 2>/dev/null || docker kill -s SIGKILL {container_id.strip()} 2>/dev/null || true", timeout=10, live=False)
                        else:
                                print_info("No containers found using port filter, trying manual approach...")
                                # Manual approach as fallback
                                run_cmd("docker kill $(docker ps -q) 2>/dev/null || true", timeout=10, live=False)

                        # Clean up stopped containers
                        print_info("Cleaning up stopped containers...")
                        run_cmd("docker container prune -f", timeout=10, live=False)
                        print_info("Retrying docker run after port conflict resolution...")
                        print_info(f"Running: {run_cmd_str}")
                        code, out, err = run_cmd(run_cmd_str, timeout=30, live=verbose)
                        if code == 0:
                                print_success("✅ Self-healing successful! Container started after resolving port conflict.")
                        else:
                                print_error("❌ Self-healing failed, manual intervention may be required.")
                                if err:
                                        print_error(f"Final error: {err}")
                                return code

                # If run failed and it wasn't a port conflict, check for existing containers with the same name and try to remove them, then retry.
                if not port_conflict:
                        print_info("🔧 Docker run failed, checking for conflicting containers...")

                        # Simple cleanup: kill and remove containers with our name
                        kill_cmd = f"docker kill {DOCKER_CONTAINER_NAME} 2>/dev/null || true"
                        run_cmd(kill_cmd, timeout=5, live=False)

                        rm_cmd = f"docker rm {DOCKER_CONTAINER_NAME} 2>/dev/null || true"
                        run_cmd(rm_cmd, timeout=5, live=False)

                        print_info("Retrying docker run after cleanup...")
                        code, out, err = run_cmd(run_cmd_str, timeout=30, live=verbose)
                        if code != 0:
                                print_error(f"Docker run failed after cleanup (code={code})")
                                if out:
                                        print(out)
                                if err:
                                        print(err, file=sys.stderr)
                                return code

        print_info("Waiting 5 seconds for container to initialize...")
        time.sleep(5)
        print_success(f"Container '{DOCKER_CONTAINER_NAME}' is running on port 3000")
        return 0


def step_pyright(verbose: bool = False) -> int:
        """Run pyright type checking."""
        print_info("--- Step 3: Running Pyright static type checker ---")

        if not os.path.exists("demo.py"):
                print_info("demo.py not found; skipping pyright check")
                return 0

        if shutil.which("uv"):
                code, out, err = run_cmd(["uv", "run", "pyright", "demo.py"], timeout=10, live=verbose)
        elif shutil.which("pyright"):
                code, out, err = run_cmd(["pyright", "demo.py"], timeout=10, live=verbose)
        else:
                print_info("pyright not found; skipping")
                return 0

        if code != 0:
                print_error("pyright failed")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)
                return code
        print_success("Pyright checks passed")
        return 0


def step_speedtest(verbose: bool = False) -> int:
        """Run speed test with demo.csv URLs."""
        print_info("--- Step: 5 Running DearReader Speed Test ---")

        if not os.path.exists("speedtest.py"):
                print_info("speedtest.py not found; skipping")
                return 0

        if not os.path.exists("demo.csv"):
                print_info("demo.csv not found; skipping speedtest")
                return 0

        # Check if aiohttp is available
        code, out, err = run_cmd(["uv", "run", "python", "-c", "import aiohttp"], timeout=5, live=verbose)
        if code != 0:
                print_error("aiohttp not installed. Run: uv pip install aiohttp")
                return code

        # Run speedtest with limited concurrency for testing
        code, out, err = run_cmd(["uv", "run", "python", "speedtest.py", "--csv", "demo.csv", "--concurrent", "2", "--quiet"], timeout=120, live=verbose)
        if code != 0:
                print_error("speedtest failed")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)
                return code
        print_success("Speed test completed successfully")
        return 0


def step_demo(verbose: bool = False) -> int:
        """Run demo.py."""
        print_info("--- Step 4: Running demo.py ---")

        if not os.path.exists("demo.py"):
                print_info("demo.py not found; skipping")
                return 0

        if shutil.which("uv"):
                code, out, err = run_cmd(["uv", "run", "python", "demo.py"], timeout=10, live=verbose)
        else:
                code, out, err = run_cmd(["python", "demo.py"], timeout=10, live=verbose)

        if code != 0:
                print_error("demo.py failed")
                if out:
                        print(out)
                if err:
                        print(err, file=sys.stderr)
                return code
        print_success("Demo script executed successfully")
        return 0


def step_stop(verbose: bool = False) -> int:
        """Stop the Docker container using docker kill $(docker ps | grep "reader-app" | head -c 12)."""
        print_info("--- Stopping Docker container ---")

        # Use the exact command format requested: docker kill $(docker ps | grep "reader-app" | head -c 12)
        kill_cmd = 'docker kill $(docker ps | grep "reader-app" | head -c 12)'
        print_info(f"Running: {kill_cmd}")

        kill_code, kill_out, kill_err = run_cmd(kill_cmd, timeout=10, live=verbose)

        if kill_code == 0:
                if kill_out.strip():
                        # If command succeeded and returned output (container ID), it means a container was killed
                        container_id = kill_out.strip()
                        print_success(f"CONTAINER STOPPED: {container_id}")
                        return 0
                else:
                        # Command succeeded but no output, likely no container was running
                        print_info("No reader-app container was running")
                        return 0
        else:
                # If command failed
                print_info("No reader-app container was running")
                return 0


def step_tests(verbose: bool = False, debug: bool = False) -> int:
        """Run ALL tests: npm, TypeScript build, pyright, demo, and speedtest."""
        print_info("--- Running ALL tests ---")

        # Run npm tests
        print_info("🧪 Running npm tests...")
        code = step_npm(debug=debug, verbose=verbose)
        if code != 0:
                print_error("npm tests failed")
                return code

        # Build TypeScript to check for compilation errors
        print_info("🏗️  Building TypeScript...")
        ts_code, ts_out, ts_err = run_cmd(["npm", "run", "build"], cwd=NPM_DIR, timeout=60, live=verbose)
        if ts_code != 0:
                print_error("TypeScript build failed")
                if ts_out:
                        print(ts_out)
                if ts_err:
                        print(ts_err, file=sys.stderr)
                return ts_code
        print_success("TypeScript build successful")

        # Run pyright
        print_info("🔍 Running pyright checks...")
        code = step_pyright(verbose=verbose)
        if code != 0:
                print_error("pyright checks failed")
                return code

        # Run demo (requires Docker container to be running)
        print_info("🔍 Checking if Docker container is running...")
        check_cmd = f"docker ps --filter name={DOCKER_CONTAINER_NAME} --format '{{{{.ID}}}}'"
        docker_code, docker_out, docker_err = run_cmd(check_cmd, timeout=5, live=verbose)

        if docker_code != 0 or not docker_out.strip():
                print_info("Docker container not running, starting it...")
                code = step_docker(verbose=verbose)
                if code != 0:
                        print_error("Failed to start Docker container for tests")
                        return code
        else:
                print_info("Docker container is already running")

        # Run demo
        print_info("🎭 Running demo tests...")
        code = step_demo(verbose=verbose)
        if code != 0:
                print_error("demo tests failed")
                return code

        # Run speedtest
        print_info("🚀 Running speedtest...")
        code = step_speedtest(verbose=verbose)
        if code != 0:
                print_error("speedtest failed")
                return code

        print_success("✅✅✅ ALL tests passed successfully! ✅✅✅")
        return 0


def main():
        import argparse

        parser = argparse.ArgumentParser(description="Unified DearReader test runner and pipeline manager")
        parser.add_argument("command", nargs="?", default="start", choices=["basic", "start", "all", "npm", "docker", "docker-clear", "pyright", "demo", "speedtest", "tests", "stop"],
                                                help="Command to run (default: start)")
        parser.add_argument("--verbose", action="store_true", help="Increase output")
        parser.add_argument("--debug", action="store_true", help="Re-run failed npm tests without timeout")
        parser.add_argument("--no-cache", dest="no_cache", action="store_true", help="Disable Docker build cache (pass --no-cache to 'docker build')")

        args = parser.parse_args()

        try:
                ensure_venv()

                # Check required tools
                print_info("Checking required tools...")
                missing = check_tools(["npm", "docker"])
                if missing:
                        print_error("Missing required tools: " + ", ".join(missing))
                        return 2
                print_success("All required tools are available")

                if args.command == "npm":
                        return step_npm(debug=args.debug, verbose=args.verbose)
                elif args.command == "docker":
                        return step_docker(verbose=args.verbose, clear_cache=args.no_cache)
                elif args.command == "docker-clear":
                        return step_docker(verbose=args.verbose, clear_cache=True)
                elif args.command == "pyright":
                        return step_pyright(verbose=args.verbose)
                elif args.command == "demo":
                        return step_demo(verbose=args.verbose)
                elif args.command == "speedtest":
                        return step_speedtest(verbose=args.verbose)
                elif args.command == "stop":
                        return step_stop(verbose=args.verbose)
                elif args.command == "tests":
                        return step_tests(verbose=args.verbose, debug=args.debug)
                elif args.command == "all":
                        # Full pipeline
                        print_info("🚀 Starting the full build and test pipeline...")
                        steps = [
                                ("npm", step_npm),
                                ("docker", step_docker),
                                ("pyright", step_pyright),
                                ("demo", step_demo),
                                ("speedtest", step_speedtest)
                        ]

                        container_started = False
                        for step_name, step_func in steps:
                                if step_name == "npm":
                                        rc = step_func(debug=args.debug, verbose=args.verbose)
                                elif step_name == "docker":
                                        rc = step_func(verbose=args.verbose, clear_cache=args.no_cache)
                                        if rc == 0:
                                                container_started = True
                                else:
                                        rc = step_func(verbose=args.verbose)

                                if rc != 0:
                                        print_error(f"Pipeline failed at step: {step_name}")
                                        return rc

                        print_success("✅✅✅ Pipeline completed successfully! ✅✅✅")

                        if container_started:
                                print_info("Container is running. To stop it later: uv run app.py stop")
                                print_info("🎯 Speedtest confirmed server is working correctly!")
                        return 0
                elif args.command == "start" or args.command == "basic":  # basic
                        # Just npm, pyright, demo
                        print_info("🚀 Starting basic pipeline (npm + pyright + demo)...")
                        steps = [
                                ("npm", step_npm),
                                ("pyright", step_pyright),
                                ("demo", step_demo)
                        ]

                        for step_name, step_func in steps:
                                if step_name == "npm":
                                        rc = step_func(debug=args.debug, verbose=args.verbose)
                                else:
                                        rc = step_func(verbose=args.verbose)

                                if rc != 0:
                                        print_error(f"Pipeline failed at step: {step_name}")
                                        return rc

                        print_success("✅ Basic pipeline completed successfully! ✅")
                        return 0

        except KeyboardInterrupt:
                print("\nInterrupted by user", file=sys.stderr)
                return 130
        except Exception as e:
                print_error(f"Unexpected error: {e}")
                return 1


if __name__ == "__main__":
        sys.exit(main())
