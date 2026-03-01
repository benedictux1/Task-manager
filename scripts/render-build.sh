#!/usr/bin/env bash
# Render build: install server deps, generate Prisma client, run migrations only.
# Do NOT use prisma db push here (it can drop columns and cause data loss).
set -e
cd server
npm install
npx prisma generate
npx prisma migrate deploy
