#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🚀 Starting Finovo..."
[ ! -f .env ] && cp .env.example .env
[ -f "./venv/bin/activate" ] && source ./venv/bin/activate
npm run dev:all
