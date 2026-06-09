#!/usr/bin/env bash
# One-time Codespace/Dev Container setup: write .env, install deps, wait for the
# database, run migrations, generate the Prisma client, and seed demo + samples.
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

echo "Waiting for the database to accept connections..."
for i in $(seq 1 60); do
  if (exec 3<>/dev/tcp/db/3306) 2>/dev/null; then
    exec 3>&-
    echo "  DB port is open."
    break
  fi
  sleep 2
done

echo "Applying migrations (retrying while MariaDB finishes initializing)..."
for i in $(seq 1 20); do
  if npx prisma migrate deploy; then
    break
  fi
  echo "  database not ready yet, retry ${i}/20..."
  sleep 3
done

npx prisma generate

echo "Seeding demo data + module samples..."
npx tsx prisma/seed.ts
npx tsx prisma/seed-samples.ts

echo ""
echo "==================================================================="
echo " Setup complete. Start CX with:   npm run dev"
echo " Open the forwarded port 3000 (the editor will offer a preview)."
echo " Admin panel: add /admin to that URL (dev-on-path mode is enabled)."
echo " Sign in with kerinhughes50@gmail.com (no password) = superadmin."
echo "==================================================================="
