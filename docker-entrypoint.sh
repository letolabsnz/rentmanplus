#!/bin/sh
set -e
cd /app
exec node server/dist/index.js
