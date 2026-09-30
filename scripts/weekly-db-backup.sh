#!/usr/bin/env bash
set -euo pipefail

# Configuration (override via environment variables)
MYSQL_CONTAINER=${MYSQL_CONTAINER:-petclinic-mysql}
MYSQL_DATABASE=${MYSQL_DATABASE:-petclinic}
MYSQL_USER=${MYSQL_USER:-petclinic}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-petclinic}
BACKUP_DIR=${BACKUP_DIR:-backups}

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

ensure_backup_dir() {
  mkdir -p "${BACKUP_DIR}"
}

create_backup() {
  local backup_file="${BACKUP_DIR}/petclinic-${1}.sql.gz"
  if ! docker ps --format '{{.Names}}' | grep -qx "${MYSQL_CONTAINER}"; then
    echo "Error: container '${MYSQL_CONTAINER}' is not running." >&2
    exit 1
  fi

  echo "Exporting database '${MYSQL_DATABASE}' from container '${MYSQL_CONTAINER}'..."
  docker exec "${MYSQL_CONTAINER}" sh -c "mysqldump -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE}" | gzip > "${backup_file}"
  echo "Backup written to ${backup_file}"
}

main() {
  ensure_backup_dir
  create_backup "$(timestamp)"
}

main "$@"
