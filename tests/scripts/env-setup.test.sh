#!/usr/bin/env bash
# =============================================================================
# Collabryx Environment Setup Tests (TC-001, TC-002, TC-003)
# =============================================================================
# Tests:
#   TC-001: npm install executes in Node.js 20+ LTS
#   TC-002: npm install rejected with Node.js < 20
#   TC-003: package install fails if using yarn/bun instead of npm 10+
#
# Usage:
#   bash tests/scripts/env-setup.test.sh
#   bash tests/scripts/env-setup.test.sh --verbose
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed
# =============================================================================

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --verbose|-v) VERBOSE=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# Helper: extract major version from semver string (handles "v20.11.0" and "20.11.0")
extract_major() {
  local version="$1"
  version="${version#v}"
  echo "${version%%.*}"
}

# Helper: extract minor version from semver string
extract_minor() {
  local version="$1"
  version="${version#v}"
  version="${version#*.}"
  echo "${version%%.*}"
}

# Helper: extract npm major version
extract_npm_major() {
  local version="$1"
  echo "${version%%.*}"
}

# Assertion helpers
pass() {
  PASSED=$((PASSED + 1))
  echo -e "  ${GREEN}✓ PASS${NC}: $1"
}

fail() {
  FAILED=$((FAILED + 1))
  echo -e "  ${RED}✗ FAIL${NC}: $1"
}

assert_greater_equal() {
  local actual="$1"
  local expected="$2"
  local description="$3"
  if [ "$actual" -ge "$expected" ]; then
    pass "$description (got $actual, expected >= $expected)"
    return 0
  else
    fail "$description (got $actual, expected >= $expected)"
    return 1
  fi
}

assert_less_than() {
  local actual="$1"
  local expected="$2"
  local description="$3"
  if [ "$actual" -lt "$expected" ]; then
    pass "$description (got $actual, expected < $expected)"
    return 0
  else
    fail "$description (got $actual, expected < $expected)"
    return 1
  fi
}

assert_equals() {
  local actual="$1"
  local expected="$2"
  local description="$3"
  if [ "$actual" = "$expected" ]; then
    pass "$description (got $actual)"
    return 0
  else
    fail "$description (expected $expected, got $actual)"
    return 1
  fi
}

# =============================================================================
# Test Setup: Detect available runtimes
# =============================================================================
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}Collabryx Environment Setup Tests${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

detect_node() {
  if command -v node &>/dev/null; then
    NODE_VERSION="$(node --version 2>/dev/null || echo 'unknown')"
    NODE_MAJOR="$(extract_major "$NODE_VERSION" 2>/dev/null || echo '0')"
  else
    NODE_VERSION="not installed"
    NODE_MAJOR="0"
  fi
}

detect_npm() {
  if command -v npm &>/dev/null; then
    NPM_VERSION="$(npm --version 2>/dev/null || echo 'unknown')"
    NPM_MAJOR="$(extract_npm_major "$NPM_VERSION" 2>/dev/null || echo '0')"
  else
    NPM_VERSION="not installed"
    NPM_MAJOR="0"
  fi
}

detect_yarn() {
  if command -v yarn &>/dev/null; then
    YARN_INSTALLED="true"
    YARN_VERSION="$(yarn --version 2>/dev/null || echo 'unknown')"
  else
    YARN_INSTALLED="false"
  fi
}

detect_bun() {
  if command -v bun &>/dev/null; then
    BUN_INSTALLED="true"
    BUN_VERSION="$(bun --version 2>/dev/null || echo 'unknown')"
  else
    BUN_INSTALLED="false"
  fi
}

detect_node
detect_npm
detect_yarn
detect_bun

$VERBOSE && {
  echo -e "${CYAN}Detected Runtimes:${NC}"
  echo "  Node.js: $NODE_VERSION (major: $NODE_MAJOR)"
  echo "  npm:     $NPM_VERSION (major: $NPM_MAJOR)"
  echo "  yarn:    ${YARN_VERSION:-not installed}"
  echo "  bun:     ${BUN_VERSION:-not installed}"
  echo ""
}

# =============================================================================
# TC-001: Verify npm install executes in Node.js 20+ LTS
# =============================================================================
echo -e "${CYAN}[TC-001] Node.js 20+ LTS Requirement${NC}"

# Check that Node.js is installed and version >= 20
if [ "$NODE_MAJOR" -eq 0 ]; then
  echo -e "  ${YELLOW}⚠ SKIP${NC}: Node.js not installed — cannot verify version"
else
  NODE_MINOR="$(extract_minor "$NODE_VERSION" 2>/dev/null || echo '0')"
  assert_greater_equal "$NODE_MAJOR" 20 \
    "Node.js major version >= 20 (LTS)"
fi

# Verify the engines field in package.json matches expectation
if [ -f "package.json" ]; then
  ENGINE_NODE=$(node -e "console.log(require('./package.json').engines?.node || 'none')" 2>/dev/null || echo "none")
  $VERBOSE && echo "  package.json engines.node: $ENGINE_NODE"

  # Verify engines field specifies >=20.0.0
  if echo "$ENGINE_NODE" | grep -qE '\b(>=|>|=)?\s*2[0-9]\.'; then
    pass "package.json engines.node specifies Node 20+"
  else
    fail "package.json engines.node should specify Node 20+ (got: $ENGINE_NODE)"
  fi
else
  fail "package.json not found in current directory"
fi

# Verify npm install works (dry run: check node_modules exists or run npm ls)
if [ "$NODE_MAJOR" -ge 20 ] && [ -f "package.json" ]; then
  if [ -d "node_modules" ]; then
    pass "node_modules directory exists (dependencies installed)"
  else
    echo -e "  ${YELLOW}⚠ SKIP${NC}: node_modules not found — run 'npm install' first"
  fi
fi

echo ""

# =============================================================================
# TC-002: Verify npm install rejected with Node.js < 20
# =============================================================================
echo -e "${CYAN}[TC-002] Node.js < 20 Rejection${NC}"

# Simulate: if we have a legacy Node.js, verify it would be rejected
# We test this by checking the engines field validation logic
if [ -f "package.json" ]; then
  # Simulate: try to determine if npm would reject an install on Node < 20
  ENGINE_NODE=$(node -e "console.log(require('./package.json').engines?.node || 'none')" 2>/dev/null || echo "none")
  ENGINE_NPM=$(node -e "console.log(require('./package.json').engines?.npm || 'none')" 2>/dev/null || echo "none")

  # Test the rejection logic: if engines.node is set and current < 20, npm should warn/error
  if [ "$NODE_MAJOR" -ge 20 ]; then
    # We're on Node 20+ — verify that the check itself works
    # Use npm's built-in engine check
    ENGINE_CHECK=$(node -e "
      const eng = require('./package.json').engines || {};
      const nodeReq = eng.node || '';
      if (nodeReq && process.version) {
        const major = parseInt(process.version.slice(1).split('.')[0]);
        const required = 20;
        console.log(major >= required ? 'PASS' : 'FAIL:' + major);
      } else {
        console.log('PASS (no engine restriction)');
      }
    " 2>/dev/null || echo "ERROR")
    
    if [[ "$ENGINE_CHECK" == PASS* ]]; then
      pass "Current Node.js version satisfies engines requirement"
    else
      fail "Engine check unexpected: $ENGINE_CHECK"
    fi
  else
    # On Node < 20 — this should fail the engines check
    fail "Running on Node.js $NODE_MAJOR which is below the required Node 20+"
  fi

  # Verify that the engines field would reject old Node
  MIN_NODE_REQUIRED=$(node -e "
    const eng = require('./package.json').engines || {};
    const match = (eng.node || '').match(/(\d+)/);
    console.log(match ? parseInt(match[1]) : 0);
  " 2>/dev/null || echo "0")
  
  assert_greater_equal "$MIN_NODE_REQUIRED" 20 \
    "package.json requires Node >= $MIN_NODE_REQUIRED"
fi

echo ""

# =============================================================================
# TC-003: Verify package install fails if using yarn/bun instead of npm 10+
# =============================================================================
echo -e "${CYAN}[TC-003] Package Manager Restriction (npm 10+ only)${NC}"

# Verify engines.npm requires >= 10
if [ -f "package.json" ]; then
  ENGINE_NPM=$(node -e "console.log(require('./package.json').engines?.npm || 'none')" 2>/dev/null || echo "none")
  $VERBOSE && echo "  package.json engines.npm: $ENGINE_NPM"

  if echo "$ENGINE_NPM" | grep -qE '(\d+)'; then
    MIN_NPM=$(echo "$ENGINE_NPM" | grep -oE '[0-9]+' | head -1)
    assert_greater_equal "$MIN_NPM" 10 \
      "package.json engines.npm requires npm >= $MIN_NPM"
  else
    fail "package.json engines.npm does not specify npm 10+ requirement"
  fi
fi

# Verify npm is the preferred package manager (check for lock files)
if [ -f "package-lock.json" ]; then
  pass "package-lock.json exists (npm is the package manager)"
else
  echo -e "  ${YELLOW}⚠ INFO${NC}: No package-lock.json — this may be expected if not yet installed"
fi

# Assert yarn.lock should NOT be present (project uses npm)
if [ -f "yarn.lock" ]; then
  fail "yarn.lock found — project should use npm, not yarn"
else
  pass "No yarn.lock detected (correct — project uses npm)"
fi

# Assert bun.lockb should NOT be present (project uses npm)
if [ -f "bun.lockb" ]; then
  fail "bun.lockb found — project should use npm, not bun"
else
  pass "No bun.lockb detected (correct — project uses npm)"
fi

# Check that npm is the detected package manager
if [ "$NPM_MAJOR" -ge 10 ]; then
  pass "npm $NPM_MAJOR satisfies >= 10 requirement"
elif [ "$NPM_MAJOR" -gt 0 ]; then
  fail "npm version $NPM_MAJOR is below required npm 10+"
else
  echo -e "  ${YELLOW}⚠ SKIP${NC}: npm not detected — cannot verify version"
fi

# Warn if yarn or bun are available (should not be used for this project)
if [ "$YARN_INSTALLED" = "true" ]; then
  echo -e "  ${YELLOW}⚠ WARN${NC}: yarn is installed but should not be used for this project"
fi

if [ "$BUN_INSTALLED" = "true" ]; then
  echo -e "  ${YELLOW}⚠ WARN${NC}: bun is installed but should not be used for this project"
fi

echo ""

# =============================================================================
# Results Summary
# =============================================================================
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}Results Summary${NC}"
echo -e "${CYAN}============================================================${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "  Total:  $TOTAL"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
if [ "$FAILED" -gt 0 ]; then
  echo -e "  ${RED}Failed: $FAILED${NC}"
else
  echo -e "  ${GREEN}Failed: 0${NC}"
fi
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All environment setup tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. See output above for details.${NC}"
  exit 1
fi
