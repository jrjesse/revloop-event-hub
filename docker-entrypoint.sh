#!/bin/sh
set -eu

mkdir -p /data
if [ ! -f /data/hub-ledger.json ]; then
  cp /app/data/hub-ledger.json /data/hub-ledger.json
fi

exec npx tsx server.ts
