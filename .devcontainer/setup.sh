#!/usr/bin/env bash
# One-time Codespace/Dev Container setup: write .env, install deps, run
# migrations, generate the Prisma client, and seed demo + sample data.
set -e
cd "$(dirname "$0")/.."

# The app URL: Codespaces forwards port 3000 to a github.dev subdomain.
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  APP_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  APP_URL="http://localhost:3000"
fi

# Write .env (gitignored) if it does not already exist.
if [ ! -f .env ]; then
  cat > .env <<EOF
DATABASE_URL="mysql://root:cxdev@db:3306/contractors_exchange"
AUTH_SECRET="$(openssl rand -base64 32)"
AUTH_URL="${APP_URL}"
UPLOAD_DIR="./public/uploads"
# Dev-only: there is no admin.* subdomain on a single-host dev box, so serve
# /admin directly on this host. Never set this in production.
CX_DEV_ADMIN_ON_PATH="1"
EOF
  echo "Wrote .env (APP_URL=${APP_URL})"
fi

echo "Installing dependencies..."
npm install

echo "Applying migrations + generating Prisma client..."
npx prisma migrate deploy
npx prisma generate

echo "Seeding demo data + module samples..."
npx tsx prisma/seed.ts
npx tsx prisma/seed-samples.ts

echo ""
echo "==================================================================="
echo " Setup complete. Start CX with:   npm run dev"
echo " Open the forwarded port 3000 (the editor will offer a preview)."
echo " Admin panel: add /admin to that URL (dev-on-path mode is enabled)."
echo " Sign in with a demo email from prisma/seed.ts (e.g. Dean Hughes)."
echo "==================================================================="
