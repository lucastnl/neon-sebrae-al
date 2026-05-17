-- Neon Sebrae AL 2026 · anti-bot tempo mínimo (17/05/2026)
-- Adiciona coluna duracao_segundos e exige >= 10s nas novas partidas.
-- Bot que dispara INSERT direto sem jogar tem 0 segundos de duração e é rejeitado
-- pelo banco. Partidas legítimas mais curtas (jogador morre rápido na fase 1)
-- duram pelo menos 12-15 segundos, então o limite de 10s não bloqueia humanos.

-- ============ 1. COLUNA DURACAO_SEGUNDOS ============
-- Nullable pra não quebrar histórico (61 partidas antigas ficam com null).
-- Novas partidas TÊM que mandar o campo (a RLS policy abaixo exige).

alter table public.partidas
  add column if not exists duracao_segundos integer;

-- ============ 2. CHECK CONSTRAINT ============
-- Valida o conteúdo da coluna quando preenchida. NULL passa pra retrocompat
-- com as 61 partidas existentes do banco.

alter table public.partidas
  drop constraint if exists partidas_duracao_min;
alter table public.partidas
  add constraint partidas_duracao_min
  check (duracao_segundos is null or (duracao_segundos >= 10 and duracao_segundos <= 3600));

-- ============ 3. RLS POLICY ATUALIZADA ============
-- Refaz a policy de INSERT incluindo a obrigação de mandar duracao >= 10.
-- Toda nova partida vai ter que comprovar tempo mínimo, senão recebe 403.

drop policy if exists "partidas_insert_validated" on public.partidas;

create policy "partidas_insert_validated" on public.partidas
  for insert
  with check (
    nome_jogador ~ '^[A-Z?]{3}$'
    and score between 0 and 999999
    and fase_max between 1 and 3
    and combo_max between 0 and 9999
    and acertos between 0 and 9999
    and (medo_escolhido is null or medo_escolhido in
        ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'))
    and em_auditoria = false
    and (jogo is null or jogo = 'monstro-proximo-passo')
    and duracao_segundos between 10 and 3600
  );

-- ============ COMO TESTAR ============
-- 1. Tenta inserir partida com duração inválida (deve falhar com erro 403):
--
-- curl -X POST 'https://supdxnfogmfjrdkgmrvo.supabase.co/rest/v1/partidas' \
--   -H "apikey: sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_" \
--   -H "Authorization: Bearer sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_" \
--   -H "Content-Type: application/json" \
--   -H "Prefer: return=representation" \
--   -d '{"caravana_id":"aa55ebd4-5710-4134-870b-25172581c8b1","nome_jogador":"BOT","score":999999,"fase_max":3,"medo_escolhido":"comparacao","acertos":300,"combo_max":300,"duracao_segundos":2}'
--
-- 2. Tenta inserir partida com duração válida (deve funcionar):
--    troca duracao_segundos pra 60 no exemplo acima.
