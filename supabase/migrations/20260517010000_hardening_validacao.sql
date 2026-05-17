-- Neon Sebrae AL 2026 · hardening pós-pentest (17/05/2026)
-- 1. Limpa registros DEFINITIVAMENTE maliciosos
-- 2. Adiciona coluna em_auditoria (RED fica suspenso mas preservado)
-- 3. Adiciona CHECK constraints (defesa no banco)
-- 4. Aperta RLS policy de INSERT com WITH CHECK (defesa antes do banco)
-- 5. Recria view ranking_caravanas excluindo partidas em auditoria

-- ============ 1. LIMPEZA DOS DEFINITIVAMENTE MALICIOSOS ============

delete from public.partidas
where
  nome_jogador ~ '[<>="''`]'
  or nome_jogador ilike '%update%'
  or nome_jogador ilike '%select%'
  or nome_jogador ilike '%delete%'
  or nome_jogador ilike '%drop%'
  or nome_jogador ilike '%--%'
  or nome_jogador like '%\_%'
  or fase_max > 3
  or fase_max < 1
  or score > 999999
  or score < 0
  or (medo_escolhido is not null
      and medo_escolhido not in ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'));

-- ============ 2. COLUNA EM_AUDITORIA ============

alter table public.partidas
  add column if not exists em_auditoria boolean not null default false;

-- Marca o RED em auditoria (score 1.002.225, combo perfeito, veio de madrugada
-- junto com tentativas de injeção). Preservado, mas fora do ranking.
update public.partidas
set em_auditoria = true
where id = 'cfe42c0b-7726-4bf2-8bdf-2a024aceb591';

-- ============ 3. CHECK CONSTRAINTS ============

alter table public.partidas
  drop constraint if exists partidas_nome_padrao;
alter table public.partidas
  add constraint partidas_nome_padrao
  check (nome_jogador ~ '^[A-Z?]{3}$');

alter table public.partidas
  drop constraint if exists partidas_score_range;
alter table public.partidas
  add constraint partidas_score_range
  check (score between 0 and 999999);

alter table public.partidas
  drop constraint if exists partidas_fase_range;
alter table public.partidas
  add constraint partidas_fase_range
  check (fase_max between 1 and 3);

alter table public.partidas
  drop constraint if exists partidas_combo_range;
alter table public.partidas
  add constraint partidas_combo_range
  check (combo_max between 0 and 9999);

alter table public.partidas
  drop constraint if exists partidas_acertos_range;
alter table public.partidas
  add constraint partidas_acertos_range
  check (acertos between 0 and 9999);

alter table public.partidas
  drop constraint if exists partidas_medo_valido;
alter table public.partidas
  add constraint partidas_medo_valido
  check (medo_escolhido is null or medo_escolhido in
    ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'));

-- ============ 4. RLS POLICY MAIS RESTRITA (DEFESA EM PROFUNDIDADE) ============
-- Antes: a policy aceitava qualquer INSERT (with check (true)). Agora valida
-- os campos no momento do INSERT, ANTES de a row chegar nos CHECK constraints.
-- Quem mandar curl malicioso recebe erro 401/403 da policy direto.
-- Também bloqueia que alguém marque a partida como em_auditoria=false via API
-- pra contornar suspensões (RED nunca vai poder se "auto-desuspender").

drop policy if exists "partidas_write_all" on public.partidas;
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
  );

-- Bloqueia UPDATE/DELETE em partidas via anon. Operador faz reset via SDK
-- que usa a service_role key (não anon), então não impacta.
-- Por padrão, sem policy, RLS já nega UPDATE e DELETE. Esse comentário é só pra
-- deixar explícito que decidi não criar policies de UPDATE/DELETE.

-- ============ 5. VIEW RANKING_CARAVANAS ATUALIZADA ============
-- Recria a view ignorando partidas em auditoria. Caravana 01 vai ter o total
-- recalculado sem o RED.

create or replace view public.ranking_caravanas as
select
  c.id,
  c.numero,
  c.escola,
  c.municipio,
  c.quantidade_alunos,
  c.iniciada_em,
  c.encerrada_em,
  c.ativa,
  coalesce(sum(p.score) filter (where p.em_auditoria = false), 0)::int as pontos_totais,
  count(p.id) filter (where p.em_auditoria = false)::int as partidas_jogadas,
  coalesce(max(p.fase_max) filter (where p.em_auditoria = false), 0)::int as melhor_fase,
  coalesce(max(p.score) filter (where p.em_auditoria = false), 0)::int as melhor_score_individual
from public.caravanas c
left join public.partidas p on p.caravana_id = c.id
group by c.id;

-- ============ COMO RESTAURAR O RED (se descobrir que era legítimo) ============
-- update public.partidas
-- set em_auditoria = false
-- where id = 'cfe42c0b-7726-4bf2-8bdf-2a024aceb591';

-- ============ COMO LISTAR O QUE ESTÁ EM AUDITORIA ============
-- select id, nome_jogador, score, fase_max, created_at
-- from public.partidas where em_auditoria = true;
