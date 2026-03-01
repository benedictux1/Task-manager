#!/usr/bin/env bash
# One-time: mark the "context" migration as already applied on an existing DB
# (e.g. production was updated with db push and has no migration history).
# Run from repo root with production DATABASE_URL:
#   DATABASE_URL="postgresql://..." bash scripts/baseline-production.sh
set -e
if [ -z "$DATABASE_URL" ]; then
  echo "Set DATABASE_URL to your production Postgres URL (e.g. from Render Dashboard → Environment)."
  exit 1
fi
cd server
npx prisma migrate resolve --applied 20250301000000_add_context_to_project_and_task
echo "Done. Migration marked as applied. You can redeploy on Render."
