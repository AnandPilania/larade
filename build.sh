#!/bin/bash

echo "Building Larade..."
echo ""

cd packages/core
echo "Building @larade/core..."
npm install --legacy-peer-deps 2>/dev/null
npm run build 2>/dev/null

cd ../driver-php
echo "Building @larade/driver-php..."
npm install --legacy-peer-deps 2>/dev/null
npm run build 2>/dev/null

cd ../driver-laravel
echo "Building @larade/driver-laravel..."
npm install --legacy-peer-deps 2>/dev/null
npm run build 2>/dev/null

cd ../cli
echo "Building @larade/cli..."
npm install --legacy-peer-deps 2>/dev/null
npm run build 2>/dev/null

cd ../..
echo ""
echo "✓ Build complete!"
echo ""
echo "Try it out:"
echo "  cd example-project"
echo "  node ../packages/cli/dist/index.js detect"
echo "  node ../packages/cli/dist/index.js upgrade laravel 10 11 --dry-run"
