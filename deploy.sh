#!/bin/bash
set -e

# Usage: ./deploy.sh user@nas-ip /path/on/nas
# Example: ./deploy.sh admin@192.168.1.100 /volume1/docker/dtu

NAS="${1:?Usage: ./deploy.sh user@nas-ip /path/on/nas}"
NAS_PATH="${2:?Usage: ./deploy.sh user@nas-ip /path/on/nas}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Building images..."
docker build -t dtu-backend "$SCRIPT_DIR"
docker build -t dtu-frontend "$SCRIPT_DIR/frontend"

echo "==> Exporting images..."
docker save dtu-backend | gzip > "$SCRIPT_DIR/dtu-backend.tar.gz"
docker save dtu-frontend | gzip > "$SCRIPT_DIR/dtu-frontend.tar.gz"

echo "==> Copying to NAS ($NAS:$NAS_PATH)..."
if ! ssh "$NAS" "mkdir -p $NAS_PATH" 2>/dev/null; then
  echo ""
  echo "  ERROR: Could not create $NAS_PATH on the NAS."
  echo "  Create it manually first:"
  echo "    ssh $NAS \"sudo mkdir -p $NAS_PATH\""
  echo "  Or create the folder via the NAS web UI, then re-run this script."
  exit 1
fi
scp "$SCRIPT_DIR/dtu-backend.tar.gz" "$SCRIPT_DIR/dtu-frontend.tar.gz" "$SCRIPT_DIR/docker-compose.prod.yml" "$NAS:$NAS_PATH"

echo "==> Loading images and restarting containers on NAS..."
ssh "$NAS" bash <<EOF
  set -e
  cd $NAS_PATH

  docker load < dtu-backend.tar.gz
  docker load < dtu-frontend.tar.gz

  if [ -z "\$DB_PASSWORD" ]; then
    echo ""
    echo "  WARNING: DB_PASSWORD is not set in the NAS environment."
    echo "  Set it with: export DB_PASSWORD=your_password"
    echo "  Then re-run: docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend"
    exit 1
  fi

  docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
EOF

echo ""
echo "==> Cleaning up local tar files..."
rm "$SCRIPT_DIR/dtu-backend.tar.gz" "$SCRIPT_DIR/dtu-frontend.tar.gz"

echo ""
echo "Done! App is running at http://$(echo "$NAS" | cut -d@ -f2):8080"
