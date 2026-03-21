#!/usr/bin/env bash
# CodeKeep — create / use / tear down a throwaway git repo for hook integration testing.
# Usage:
#   ./scripts/git-test-sandbox.sh create [DIR]           # default: $TMPDIR/codekeep-git-sandbox-XXXX
#   ./scripts/git-test-sandbox.sh install-hook HOOK_SRC [DIR]
#   ./scripts/git-test-sandbox.sh commit MESSAGE [DIR]
#   ./scripts/git-test-sandbox.sh teardown DIR
#
# Environment:
#   CODEKEEP_SANDBOX_DIR — if set, create/install-hook/commit use this directory.

set -euo pipefail

die() { echo "git-test-sandbox: $*" >&2; exit 1; }

require_git() {
  command -v git >/dev/null 2>&1 || die "git is not installed or not on PATH"
}

sandbox_from_arg_or_env() {
  local d="${1:-}"
  if [[ -n "${CODEKEEP_SANDBOX_DIR:-}" ]]; then
    echo "$CODEKEEP_SANDBOX_DIR"
  elif [[ -n "$d" ]]; then
    echo "$d"
  else
    echo ""
  fi
}

cmd_create() {
  require_git
  local target="${1:-}"
  local root
  if [[ -n "$target" ]]; then
    root="$(cd "$(dirname "$target")" && pwd)/$(basename "$target")"
    mkdir -p "$root"
  else
    root="$(mktemp -d "${TMPDIR:-/tmp}/codekeep-git-sandbox-XXXX")"
  fi

  export CODEKEEP_SANDBOX_DIR="$root"
  git -C "$root" init -q
  git -C "$root" config user.email "codekeep-test@local"
  git -C "$root" config user.name "CodeKeep Test"
  printf '%s\n' "# CodeKeep git sandbox" >"$root/README.md"
  git -C "$root" add README.md
  git -C "$root" commit -q -m "chore: initial commit"

  echo "Created sandbox: $root"
  echo "export CODEKEEP_SANDBOX_DIR=$root"
}

cmd_install_hook() {
  require_git
  local hook_src="${1:-}"
  local root
  root="$(sandbox_from_arg_or_env "${2:-}")"
  [[ -n "$hook_src" ]] || die "install-hook: missing HOOK_SRC"
  [[ -n "$root" ]] || die "install-hook: set CODEKEEP_SANDBOX_DIR or pass DIR"
  [[ -d "$root/.git" ]] || die "not a git repo: $root"
  [[ -f "$hook_src" ]] || die "hook not found: $hook_src"

  mkdir -p "$root/.git/hooks"
  cp -f "$hook_src" "$root/.git/hooks/post-commit"
  chmod +x "$root/.git/hooks/post-commit"
  echo "Installed post-commit from $hook_src → $root/.git/hooks/post-commit"
}

cmd_commit() {
  require_git
  local msg="${1:-}"
  local root
  root="$(sandbox_from_arg_or_env "${2:-}")"
  [[ -n "$msg" ]] || die "commit: missing MESSAGE"
  [[ -n "$root" ]] || die "commit: set CODEKEEP_SANDBOX_DIR or pass DIR"
  [[ -d "$root/.git" ]] || die "not a git repo: $root"

  echo "sandbox $(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$root/README.md"
  git -C "$root" add README.md
  git -C "$root" commit -q -m "$msg"
  echo "Committed in $root: $msg"
}

cmd_teardown() {
  local root="${1:-}"
  root="${root:-${CODEKEEP_SANDBOX_DIR:-}}"
  [[ -n "$root" ]] || die "teardown: pass DIR or set CODEKEEP_SANDBOX_DIR"
  [[ -d "$root" ]] || die "teardown: not a directory: $root"
  rm -rf "$root"
  echo "Removed $root"
}

case "${1:-}" in
  create) shift; cmd_create "$@" ;;
  install-hook) shift; cmd_install_hook "$@" ;;
  commit) shift; cmd_commit "$@" ;;
  teardown) shift; cmd_teardown "$@" ;;
  *)
    die "unknown command: ${1:-}. Try: create | install-hook | commit | teardown"
    ;;
esac
