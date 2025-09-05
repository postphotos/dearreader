#!/usr/bin/env bash
# Lightweight wrapper to keep compatibility with scripts that call test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$(command -v python3 || command -v python)"
if [ -z "$PY" ]; then
  echo "python not found in PATH" >&2
  exit 2
fi

"$PY" "$SCRIPT_DIR/test.py" "$@"
exit $?
#!/usr/bin/env bash
set -euo pipefail

# Minimal wrapper for the Python test runner
if ! command -v python3 >/dev/null 2>&1; then
  echo "[ERROR] python3 not found in PATH; please install Python 3." >&2
  exit 1
fi

PY=$(command -v python3)
exec "$PY" "$(dirname "$0")/test.py" "$@"
#!/usr/bin/env bash
set -euo pipefail

# Minimal wrapper for the Python test runner
if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] python3 not found in PATH; please install Python 3." >&2
    exit 1
fi

PY=$(command -v python3)
exec "$PY" "$(dirname "$0")/test.py" "$@"
        --quiet ) VERBOSE=false ;;
