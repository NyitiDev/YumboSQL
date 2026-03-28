#!/bin/bash
cd "$(dirname "$0")"

# Kill any leftover processes on port 3000
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null

# Pass NoLogo flag via environment variable
if [[ "$*" == *"NoLogo"* ]]; then
  export YUMBOSQL_NO_LOGO=1
fi

# Start the app (Vite + Electron)
npm run dev
