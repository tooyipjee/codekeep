#!/bin/sh
set -e

REPO="tooyipjee/codekeep"
INSTALL_DIR="${CODEKEEP_INSTALL_DIR:-$HOME/.codekeep}"
BIN_DIR="${CODEKEEP_BIN_DIR:-$HOME/.local/bin}"

main() {
  check_node
  get_version
  download
  create_launcher
  check_path
  echo ""
  echo "  CodeKeep: The Pale v${VERSION} installed successfully!"
  echo ""
  echo "  Run 'codekeep' to play."
  echo ""
}

check_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js >= 20 is required but not found." >&2
    echo "" >&2
    echo "Install Node.js: https://nodejs.org" >&2
    echo "  macOS:   brew install node" >&2
    echo "  Ubuntu:  sudo apt install nodejs" >&2
    echo "  or:      curl -fsSL https://fnm.vercel.app/install | bash" >&2
    exit 1
  fi

  NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
  if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "Error: Node.js >= 20 required (found v$(node --version))." >&2
    exit 1
  fi
}

get_version() {
  if [ -n "$CODEKEEP_VERSION" ]; then
    VERSION="$CODEKEEP_VERSION"
  else
    VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed 's/.*"v\(.*\)".*/\1/')
    if [ -z "$VERSION" ]; then
      echo "Error: Could not determine latest version." >&2
      echo "Set CODEKEEP_VERSION=x.y.z to install a specific version." >&2
      exit 1
    fi
  fi
  echo "Installing CodeKeep v${VERSION}..."
}

download() {
  URL="https://github.com/${REPO}/releases/download/v${VERSION}/codekeep.mjs"
  mkdir -p "$INSTALL_DIR"
  echo "Downloading from ${URL}..."
  if ! curl -fsSL "$URL" -o "$INSTALL_DIR/codekeep.mjs"; then
    echo "Error: Download failed." >&2
    echo "Check that v${VERSION} exists: https://github.com/${REPO}/releases" >&2
    exit 1
  fi
  chmod +x "$INSTALL_DIR/codekeep.mjs"
}

create_launcher() {
  mkdir -p "$BIN_DIR"
  cat > "$BIN_DIR/codekeep" << 'LAUNCHER'
#!/bin/sh
exec node "$HOME/.codekeep/codekeep.mjs" "$@"
LAUNCHER
  chmod +x "$BIN_DIR/codekeep"
}

check_path() {
  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *)
      echo ""
      echo "  Add to your PATH (add to ~/.bashrc or ~/.zshrc):"
      echo ""
      echo "    export PATH=\"$BIN_DIR:\$PATH\""
      ;;
  esac
}

main
