#!/bin/sh
# SessionStart hook: start `npm run dev:multi` in the background unless it is already running.
cd "$(dirname "$0")/.." || exit 0
if lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1 || lsof -nP -iTCP:8787 -sTCP:LISTEN >/dev/null 2>&1; then
  echo '{"systemMessage":"dev 서버가 이미 켜져 있어요 → http://localhost:5173"}'
  exit 0
fi
[ -d node_modules ] || npm ci >/dev/null 2>&1
nohup npm run dev:multi > .claude/dev.log 2>&1 < /dev/null &
echo '{"systemMessage":"dev 서버를 켰어요 → http://localhost:5173 (로그: .claude/dev.log)"}'
