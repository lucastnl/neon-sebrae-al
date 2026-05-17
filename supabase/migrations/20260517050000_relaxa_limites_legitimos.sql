-- Neon Sebrae AL 2026 · relaxa limites pra cobrir partidas legítimas longas
-- Lucas teve partida real rejeitada porque algum campo passou dos limites
-- conservadores que coloquei no hardening. Sintoma: "NAO SALVOU: new row
-- violates row-level security policy" em partida normal.
-- Possíveis causas: acertos > 9999, combo > 9999, ou duracao > 3600s.
-- Solução: ampliar pra valores que cobrem fase 3 infinita por muito tempo
-- sem abrir brecha pra bot absurdo.

-- ============ CHECK CONSTRAINTS AMPLIADAS ============

alter table public.partidas drop constraint if exists partidas_combo_range;
alter table public.partidas
  add constraint partidas_combo_range
  check (combo_max between 0 and 99999);

alter table public.partidas drop constraint if exists partidas_acertos_range;
alter table public.partidas
  add constraint partidas_acertos_range
  check (acertos between 0 and 99999);

alter table public.partidas drop constraint if exists partidas_duracao_min;
alter table public.partidas
  add constraint partidas_duracao_min
  check (duracao_segundos is null or (duracao_segundos >= 10 and duracao_segundos <= 7200));

-- ============ RLS POLICY ATUALIZADA ============
-- Reflete os novos limites na policy de INSERT.

drop policy if exists "partidas_insert_validated" on public.partidas;

create policy "partidas_insert_validated" on public.partidas
  for insert
  with check (
    nome_jogador ~ '^[A-Z?]{3}$'
    and score between 0 and 999999
    and fase_max between 1 and 3
    and combo_max between 0 and 99999
    and acertos between 0 and 99999
    and (medo_escolhido is null or medo_escolhido in
        ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'))
    and em_auditoria = false
    and (jogo is null or jogo = 'monstro-proximo-passo')
    and duracao_segundos between 10 and 7200
    and device_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );
