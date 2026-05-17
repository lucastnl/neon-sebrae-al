-- Neon Sebrae AL 2026 · device_id pra auditoria (17/05/2026)
-- Adiciona coluna device_id (UUID gerado no browser, salvo em localStorage).
-- Identifica DISPOSITIVO (não pessoa). LGPD-friendly, dado totalmente anônimo.
-- Permite cruzar partidas do mesmo dispositivo mesmo com nomes diferentes.

-- ============ 1. COLUNA DEVICE_ID ============
-- Nullable pra não quebrar histórico (61 partidas antigas ficam null).
-- Novas partidas TÊM que mandar (RLS policy abaixo exige).

alter table public.partidas
  add column if not exists device_id text;

create index if not exists partidas_device_idx on public.partidas(device_id);

-- ============ 2. CHECK CONSTRAINT ============
-- Valida formato UUID v4 quando preenchido. NULL passa pra retrocompat.

alter table public.partidas
  drop constraint if exists partidas_device_uuid;
alter table public.partidas
  add constraint partidas_device_uuid
  check (device_id is null or device_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

-- ============ 3. RLS POLICY ATUALIZADA ============
-- Inclui obrigação de mandar device_id válido no INSERT.

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
    and device_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );

-- ============ QUERIES DE AUDITORIA ============

-- Devices com mais partidas (top "jogadores" reais, agnóstico ao nome):
-- select device_id, count(*) as partidas,
--        array_agg(distinct nome_jogador) as nomes_usados
-- from public.partidas
-- where device_id is not null
-- group by device_id
-- order by partidas desc;

-- Suspeitos: device com muitos nomes diferentes (multi-nick):
-- select device_id, count(distinct nome_jogador) as nicks
-- from public.partidas
-- where device_id is not null
-- group by device_id
-- having count(distinct nome_jogador) > 3;

-- Suspeitos: device com partidas em sequência muito rápida (bot):
-- with seq as (
--   select device_id, created_at,
--          lag(created_at) over (partition by device_id order by created_at) as prev
--   from public.partidas where device_id is not null
-- )
-- select device_id, count(*) as partidas_rapidas
-- from seq
-- where extract(epoch from (created_at - prev)) < 15
-- group by device_id;
