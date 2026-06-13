#!/bin/sh
# Tribler defaults to binding the API to 127.0.0.1, which breaks port mapping.
# Patch http_host once after the config file is created, then restart.
set -e

CONFIG=/root/.Tribler/8.0/configuration.json
BIND="${CORE_API_BIND_ADDRESS:-0.0.0.0}"

if [ -f "$CONFIG" ] && grep -q '"http_host": "127.0.0.1"' "$CONFIG"; then
  sed -i "s/\"http_host\": \"127.0.0.1\"/\"http_host\": \"$BIND\"/" "$CONFIG"
  exec /usr/share/tribler/tribler "$@"
fi

/usr/share/tribler/tribler "$@" &
pid=$!
i=0
while [ ! -f "$CONFIG" ] && [ "$i" -lt 90 ]; do
  sleep 1
  i=$((i + 1))
done

if [ -f "$CONFIG" ] && grep -q '"http_host": "127.0.0.1"' "$CONFIG"; then
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  sed -i "s/\"http_host\": \"127.0.0.1\"/\"http_host\": \"$BIND\"/" "$CONFIG"
  exec /usr/share/tribler/tribler "$@"
fi

wait "$pid"
