#!/usr/bin/env bash
# Installs the standalone (non-Nx) apps that live outside the root workspace.
# Each has its own pnpm project + lockfile (web/ + the framework boilerplates).
# Run automatically from the root `pnpm install` (postinstall), or on its own.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

# Standalone pnpm apps, each self-contained with its own lockfile.
APPS=(apps/web apps/angular-app apps/angular-ssr apps/remix-app apps/nuxt-app)

for app in "${APPS[@]}"; do
  dir="$ROOT/$app"
  if [ -f "$dir/package.json" ]; then
    echo "==> pnpm install in $app"
    (cd "$dir" && pnpm install)
  else
    echo "==> skip $app (no package.json)"
  fi
done

echo "All standalone apps installed."
