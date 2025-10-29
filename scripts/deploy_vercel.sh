#!/usr/bin/env bash
# Simple deploy script for Vercel
# Usage:
#   1) Install vercel CLI: npm i -g vercel
#   2) Export VERCEL_TOKEN (or set in CI) and optionally VERCEL_ORG_ID and VERCEL_PROJECT_ID
#   3) ./scripts/deploy_vercel.sh --prod

set -euo pipefail

VERCEL_CMD=$(command -v vercel || true)
if [ -z "$VERCEL_CMD" ]; then
  echo "vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

PROD_FLAG=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod) PROD_FLAG="--prod"; shift ;;
    --confirm) CONFIRM=1; shift ;;
    -h|--help) echo "Usage: $0 [--prod]"; exit 0 ;;
    *) shift ;;
  esac
done

if [ -z "${VERCEL_TOKEN:-}" ]; then
  echo "Please set VERCEL_TOKEN environment variable with a Vercel personal token."
  exit 1
fi

echo "Deploying to Vercel..."
if [ -n "${VERCEL_ORG_ID:-}" ] && [ -n "${VERCEL_PROJECT_ID:-}" ]; then
  vercel --token "$VERCEL_TOKEN" --confirm $PROD_FLAG --org "$VERCEL_ORG_ID" --project "$VERCEL_PROJECT_ID"
else
  vercel --token "$VERCEL_TOKEN" --confirm $PROD_FLAG
fi

echo "Deploy command finished. Check the Vercel dashboard for status and URL."
