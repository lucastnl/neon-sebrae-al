-- Neon Sebrae AL 2026 · schema inicial
-- 2 tabelas (caravanas e partidas) + 1 view de ranking + RLS aberto pra leitura/escrita

-- ============ TABELAS ============

create table if not exists public.caravanas (
  id uuid primary key default gen_random_uuid(),
  numero int not null,
  escola text,
  municipio text,
  quantidade_alunos int,
  iniciada_em timestamptz not null default now(),
  encerrada_em timestamptz,
  ativa boolean not null default true
);

create index if not exists caravanas_ativa_idx on public.caravanas(ativa);
create index if not exists caravanas_numero_idx on public.caravanas(numero);

create table if not exists public.partidas (
  id uuid primary key default gen_random_uuid(),
  caravana_id uuid references public.caravanas(id) on delete cascade,
  jogo text not null default 'monstro-proximo-passo',
  nome_jogador text,
  score int not null default 0,
  fase_max int not null default 1,
  medo_escolhido text,
  acertos int default 0,
  combo_max int default 0,
  created_at timestamptz not null default now()
);

create index if not exists partidas_caravana_idx on public.partidas(caravana_id);
create index if not exists partidas_score_idx on public.partidas(score desc);
create index if not exists partidas_created_idx on public.partidas(created_at desc);

-- ============ VIEWS ============

-- Ranking somado por caravana (pra dashboard)
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
  coalesce(sum(p.score), 0)::int as pontos_totais,
  count(p.id)::int as partidas_jogadas,
  coalesce(max(p.fase_max), 0)::int as melhor_fase,
  coalesce(max(p.score), 0)::int as melhor_score_individual
from public.caravanas c
left join public.partidas p on p.caravana_id = c.id
group by c.id;

-- Top scores por caravana ativa (pra tela inicial do jogo)
create or replace view public.top_caravana_ativa as
select
  c.id as caravana_id,
  c.numero as caravana_numero,
  p.nome_jogador,
  p.score,
  p.fase_max,
  p.created_at
from public.caravanas c
join public.partidas p on p.caravana_id = c.id
where c.ativa = true
order by p.score desc
limit 10;

-- ============ ROW LEVEL SECURITY ============
-- Aberto pra evento (sem autenticação). Restringir depois.

alter table public.caravanas enable row level security;
alter table public.partidas enable row level security;

drop policy if exists "caravanas_read_all" on public.caravanas;
create policy "caravanas_read_all" on public.caravanas for select using (true);

drop policy if exists "caravanas_write_all" on public.caravanas;
create policy "caravanas_write_all" on public.caravanas for all using (true) with check (true);

drop policy if exists "partidas_read_all" on public.partidas;
create policy "partidas_read_all" on public.partidas for select using (true);

drop policy if exists "partidas_write_all" on public.partidas;
create policy "partidas_write_all" on public.partidas for insert with check (true);

-- ============ REALTIME ============
-- Habilita realtime na tabela partidas pra dashboard ao vivo

alter publication supabase_realtime add table public.partidas;

-- ============ SEED ============
-- Caravana 1 ativa pra começar
insert into public.caravanas (numero, ativa)
values (1, true)
on conflict do nothing;
