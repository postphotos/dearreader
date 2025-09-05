#!/usr/bin/env python3
"""Portable test runner replacing test.sh

Runs npm install/test in ./backend/functions (if present), enforces timeouts
that reliably kill process groups, and re-runs failing npm tests without a
timeout to capture full output for debugging. Also runs pyright and demo.py if
available.
"""

from __future__ import annotations

import os
import shlex
import signal
import shutil
import subprocess
import sys
import time
from typing import Optional, Tuple


def log(msg: str) -> None:
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}")


def run_cmd(cmd, cwd: Optional[str] = None, timeout: Optional[int] = None, live: bool = False) -> Tuple[int, str, str]:
    """Run command. If timeout expires, kill the whole process group.

    Returns (exit_code, stdout, stderr). When live=True, stdout/stderr are
    empty because output streams to the terminal.
    """
    if isinstance(cmd, (list, tuple)):
        popen_cmd = cmd
        shell = False
    else:
        popen_cmd = cmd
        shell = True

    preexec_fn = os.setsid

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


def main(argv=None) -> int:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--verbose", action="store_true")
    # default timeout 5 seconds (5000 ms)
    parser.add_argument("--debug", action="store_true", help="on failure/timeouts, re-run npm test without timeout to collect full logs")
    parser.add_argument("--npm-timeout", type=int, default=int(os.environ.get("NPM_TEST_TIMEOUT", "5")))
    args = parser.parse_args(argv)

    VERBOSE = args.verbose and not args.quiet

    def info(s: str) -> None:
        if VERBOSE:
            log(s)

    def success(s: str) -> None:
        log("[SUCCESS] " + s)

    def error(s: str) -> None:
        print("[ERROR] " + s, file=sys.stderr)

    info("Checking required tools...")
    missing = check_tools(["npm", "docker", "docker-compose"])
    if missing:
        error("Missing required tools: " + ", ".join(missing))
        return 2

    # Choose node project dir
    npm_dir = os.path.join(os.getcwd(), "backend", "functions")
    if not os.path.isdir(npm_dir):
        npm_dir = os.getcwd()

    info(f"Step 1: running npm install in {npm_dir}")
    code, out, err = run_cmd(["npm", "install"], cwd=npm_dir, timeout=300, live=VERBOSE)
    if code != 0:
        error(f"npm install failed (code={code})")
        if out:
            print(out)
        if err:
            print(err, file=sys.stderr)
        return code
    success("Dependencies installed successfully")

    info("Step 2: running npm test")
    code, out, err = run_cmd(["npm", "test"], cwd=npm_dir, timeout=args.npm_timeout, live=VERBOSE)
    if code == 124:
        error(f"npm tests exceeded timeout ({args.npm_timeout}s / {args.npm_timeout * 1000}ms) — considered too long")
        if args.debug:
            info("Debug mode: re-running npm test without timeout to capture full output...")
            code2, out2, err2 = run_cmd(["npm", "test"], cwd=npm_dir, timeout=None, live=False)
            if out2:
                print(out2)
            if err2:
                print(err2, file=sys.stderr)
            return code2 or 1
        else:
            info("Not in debug mode; skipping debug re-run. Use --debug to re-run without timeout.")
            return 124
    if code != 0:
        error(f"npm tests failed (code={code}); re-running to capture output")
        code2, out2, err2 = run_cmd(["npm", "test"], cwd=npm_dir, timeout=None, live=False)
        if out2:
            print(out2)
        if err2:
            print(err2, file=sys.stderr)
        return code2
    success("npm tests passed")

    info("Step 3: running pyright if available")
    if shutil.which("pyright"):
        code, out, err = run_cmd(["pyright", "demo.py"], timeout=10, live=VERBOSE)
        if code != 0:
            error("pyright failed")
            if out:
                print(out)
            if err:
                print(err, file=sys.stderr)
            return code
        success("pyright passed")
    else:
        info("pyright not found; skipping")

    info("Step 4: running demo.py if present")
    if os.path.exists("demo.py"):
        py = shutil.which("python3") or shutil.which("python")
        if not py:
            info("python not found; skipping demo.py")
        else:
            code, out, err = run_cmd([py, "demo.py"], timeout=10, live=VERBOSE)
            if code != 0:
                error("demo.py failed")
                if out:
                    print(out)
                if err:
                    print(err, file=sys.stderr)
                return code
            success("demo.py completed successfully")
    else:
        info("demo.py not present; skipping")

    info("All steps completed successfully")
    return 0


if __name__ == "__main__":
    rc = main()
    sys.exit(rc)
