#!/usr/bin/env bash
set -euo pipefail

cd /home/ec2-user

read -r -s -p "New admin password: " admin_password
printf '\n'
read -r -s -p "Repeat admin password: " admin_password_confirmation
printf '\n'

if [[ "$admin_password" != "$admin_password_confirmation" ]]; then
  echo "Passwords do not match. No change was made."
  exit 1
fi

if (( ${#admin_password} < 12 )); then
  echo "Use at least 12 characters. No change was made."
  exit 1
fi

if [[ ! "$admin_password" =~ ^[A-Za-z0-9._!@-]+$ ]]; then
  echo "Use letters, numbers, and only . _ ! @ - as symbols. No change was made."
  exit 1
fi

umask 077
grep -v -E '^APP_BOOTSTRAP_ADMIN_(USERNAME|PASSWORD)=' .env > .env.admin-next
printf 'APP_BOOTSTRAP_ADMIN_USERNAME=admin\n' >> .env.admin-next
printf 'APP_BOOTSTRAP_ADMIN_PASSWORD=%s\n' "$admin_password" >> .env.admin-next
mv .env.admin-next .env
unset admin_password admin_password_confirmation
chmod 600 .env

docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  up -d --no-deps --force-recreate spring

echo "Admin password configuration applied. Wait for Spring startup before logging in."
