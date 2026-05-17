#!/bin/bash
# Backup das tabelas partidas e caravanas em CSV.
# Roda manualmente quando quiser ou via cron remoto. Salva em ./backups/ com timestamp.

set -e

SUPABASE_URL="https://supdxnfogmfjrdkgmrvo.supabase.co"
SUPABASE_KEY="sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_"
BACKUP_DIR="$(dirname "$0")/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

echo "Baixando partidas..."
curl -s "$SUPABASE_URL/rest/v1/partidas?select=*" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Accept: text/csv" \
  > "$BACKUP_DIR/partidas_${TIMESTAMP}.csv"

echo "Baixando caravanas..."
curl -s "$SUPABASE_URL/rest/v1/caravanas?select=*" \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Accept: text/csv" \
  > "$BACKUP_DIR/caravanas_${TIMESTAMP}.csv"

LINHAS=$(wc -l < "$BACKUP_DIR/partidas_${TIMESTAMP}.csv")
echo "OK. Backup salvo em:"
echo "  $BACKUP_DIR/partidas_${TIMESTAMP}.csv ($LINHAS linhas)"
echo "  $BACKUP_DIR/caravanas_${TIMESTAMP}.csv"
