# tasks.py
# This file sets the invoke command

from contextvars import Context
import shutil
from invoke import tasks, context, exceptions

# --- Configuration ---
DOCKER_IMAGE_NAME = "my-app"
DOCKER_CONTAINER_NAME = "my-app-instance"
VENV_NAME = ".venv"

# --- Helper Functions for Colored Output ---
def print_info(message):
    """Prints an informational message in blue."""
    print(f"\033[94m[INFO] {message}\033[0m")

def print_success(message):
    """Prints a success message in green."""
    print(f"\033[92m[SUCCESS] {message}\033[0m")

def print_error(message):
    """Prints an error message in red."""
    print(f"\033[91m[ERROR] {message}\033[0m", flush=True)


@task
def check_deps(c: context):
    """Check if required command-line tools are installed."""
    print_info("Checking for required dependencies...")
    deps = ["npm", "docker", "uv", "pyright"]
    missing = []
    for dep in deps:
        if not shutil.which(dep):
            missing.append(dep)

    if missing:
        print_error(f"The following required tools are not installed or not in your PATH: {', '.join(missing)}")
        exit(1)

    print_success("All dependencies are present.")

@task
def clean(c: Context):
    """Stop and remove the Docker container and optionally the venv."""
    print_info("--- Running cleanup ---")
    # Use warn=True so it doesn't fail if the container doesn't exist
    result = c.run(f"docker ps -a -q -f name={DOCKER_CONTAINER_NAME}", hide=True, warn=True)
    container_id = result.stdout.strip()

    if container_id:
        print_info(f"Stopping container {DOCKER_CONTAINER_NAME} ({container_id[:12]})")
        c.run(f"docker stop {container_id}", hide=True)
        print_info(f"Removing container {DOCKER_CONTAINER_NAME} ({container_id[:12]})")
        c.run(f"docker rm {container_id}", hide=True)
    else:
        print_info("No running container to clean up.")

@task(pre=[check_deps])
def npm_test(c: Context):
    """Install Node.js dependencies and run tests."""
    print_info("--- Step 1: Running npm install and tests ---")
    # pty=True provides interactive terminal output, which is better for long-running processes
    c.run("npm install", pty=True)
    c.run("npm test", pty=True)
    print_success("NPM tests passed.")

@task(pre=[npm_test])
def docker_build(c: Context):
    """Build the Docker image for the application."""
    print_info(f"--- Step 2: Building Docker image '{DOCKER_IMAGE_NAME}' ---")
    c.run(f"docker build -t {DOCKER_IMAGE_NAME} .", pty=True)
    print_success("Docker image built successfully.")

@tasks(pre=[docker_build])
def docker_run(c: Context):
    """Run the Docker container in detached mode."""
    print_info(f"--- Step 3: Running Docker container '{DOCKER_CONTAINER_NAME}' ---")
    # First, ensure no container with the same name exists
    clean(c)
    c.run(f"docker run -d --name {DOCKER_CONTAINER_NAME} {DOCKER_IMAGE_NAME}", pty=True)
    print_info("Waiting 5 seconds for container to initialize...")
    c.run("sleep 5")
    print_success(f"Container '{DOCKER_CONTAINER_NAME}' is running.")

@task
def pyright(c: Context):
    """Run Pyright for static type checking."""
    print_info("--- Step 4: Running Pyright static type checker ---")
    c.run("pyright", pty=True)
    print_success("Pyright checks passed.")

@task
def python_run(c: Context):
    """Set up Python environment and run the demo script."""
    print_info("--- Step 5: Running Python application ---")
    if not shutil.os.path.exists(VENV_NAME):
        c.run(f"uv venv {VENV_NAME}", pty=True)

    print_info("Installing Python dependencies with uv...")
    c.run("uv pip install -r requirements.txt", pty=True)

    print_info("Running the Python script...")
    c.run("uv run python demo.py", pty=True)
    print_success("Python script executed successfully.")


@task(pre=[check_deps])
def all(c: Context):
    """
    Run the entire CI/CD pipeline: test, build, run, check, and clean up.
    """
    print_info("🚀 Starting the full build and test pipeline...")
    container_started = False
    try:
        npm_test(c)
        docker_build(c)
        docker_run(c)
        container_started = True
        pyright(c)
        python_run(c)
        print_success("✅✅✅ Pipeline completed successfully! ✅✅✅")

    except exceptions.UnexpectedExit as e:
        print_error("\n💥💥💥 PIPELINE FAILED! 💥💥💥")
        print_error(f"A command failed with exit code {e.result.exited}.")
        print("-" * 60)
        print(f"Failed Command: {e.result.command}")
        print("-" * 60)
        if e.result.stdout:
            print("\n--- STDOUT ---")
            print(e.result.stdout.strip())
        if e.result.stderr:
            print("\n--- STDERR ---")
            print(e.result.stderr.strip())
        print("-" * 60)
        # Exit with the same error code as the failed command
        exit(e.result.exited)

    finally:
        # This block will run whether the try block succeeded or failed
        if container_started:
            print_info("\n--- Pipeline finished, proceeding to cleanup. ---")
            clean(c)