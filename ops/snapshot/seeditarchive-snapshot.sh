#!/bin/sh
# Regenerate the public Seedit Archive snapshot (DEPLOY.md §7).
#
# Runs the engine's snapshot export in a one-off container of the pinned server
# image, so it reads the live database and takedown blocklist with the same
# engine version as the running server. The new snapshot becomes `latest` and
# every older one is deleted: content taken down since must not stay
# downloadable.
#
# A published snapshot that predates the current blocklist is unpublished
# before regenerating, so a failed export leaves no snapshot rather than a
# stale one. If the blocklist changes while the export runs, it runs again.
set -eu

APP_DIR=/opt/seeditarchive
OUT_DIR=/srv/seeditarchive-snapshots
STATE_DIR=/var/lib/seeditarchive-snapshot
BLOCKLIST="$APP_DIR/config/blocklist.json"

# Empty when the file is missing; the export itself then refuses to run.
blocklist_hash() {
  sha256sum "$BLOCKLIST" 2>/dev/null | cut -d' ' -f1
}

# Delete every snapshot except the one named in $1 (none if empty), including
# a hidden temporary directory left by an export that was killed.
prune() {
  find "$OUT_DIR" -mindepth 1 -maxdepth 1 -name '*seeditarchive-*' ! -name "${1:-}" -exec rm -rf {} +
}

exec 9>/run/seeditarchive-snapshot.lock
flock 9

mkdir -p "$OUT_DIR" "$STATE_DIR"
cd "$APP_DIR"

while :; do
  current=$(blocklist_hash)
  if [ "$current" != "$(cat "$STATE_DIR/published-blocklist.sha256" 2>/dev/null || true)" ]; then
    echo "published snapshot predates the current blocklist; unpublishing it before regenerating"
    rm -f "$OUT_DIR/latest" "$STATE_DIR/published-blocklist.sha256"
    prune
  fi

  name="seeditarchive-$(date -u +%Y%m%dT%H%M%SZ)"
  docker compose run --rm --no-deps -T -v "$OUT_DIR:/snapshots" \
    server node dist/snapshot.js "/snapshots/$name"

  ln -sfn "$name" "$OUT_DIR/.latest.tmp"
  mv -T "$OUT_DIR/.latest.tmp" "$OUT_DIR/latest"
  prune "$name"
  printf '%s\n' "$current" > "$STATE_DIR/published-blocklist.sha256"

  [ "$(blocklist_hash)" = "$current" ] && break
  echo "blocklist changed during the export; regenerating"
done
