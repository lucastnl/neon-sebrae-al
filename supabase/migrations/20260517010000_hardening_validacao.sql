-- Neon Sebrae AL 2026 · hardening pós-pentest (17/05/2026)
-- Adiciona CHECK constraints na tabela partidas pra impedir scores/fases/nomes
-- inválidos via API direta, e limpa os registros maliciosos atuais.

-- ============ LIMPEZA DOS DADOS MALICIOSOS ============
-- Remove tentativas de XSS (HTML/SVG no nome) e SQL injection text.
-- Remove scores impossíveis (acima de 999999) e fases inválidas (fora de 1-3).

delete from public.partidas
where
  -- XSS attempts: nome contém tags HTML ou aspas suspeitas
  nome_jogador ~ '<|>|=|"|''|`'
  -- SQL injection attempts no nome
  or nome_jogador ilike '%update%'
  or nome_jogador ilike '%select%'
  or nome_jogador ilike '%delete%'
  or nome_jogador ilike '%drop%'
  or nome_jogador ilike '%--%'
  -- Nomes fora do padrão 3 letras maiúsculas (deixa o '???' do legado anônimo passar)
  or (nome_jogador !~ '^[A-Z?]{3}$' and length(nome_jogador) <> 3)
  -- Scores fora do razoável
  or score > 999999
  or score < 0
  -- Fases impossíveis
  or fase_max not between 1 and 3;

-- ============ CHECK CONSTRAINTS ============
-- A partir daqui, qualquer INSERT que violar essas regras vai falhar no banco,
-- independente de quem chama (UI legítima ou curl malicioso).

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

-- medo_escolhido deve ser um dos 4 valores válidos (ou null pra legado)
alter table public.partidas
  drop constraint if exists partidas_medo_valido;
alter table public.partidas
  add constraint partidas_medo_valido
  check (medo_escolhido is null or medo_escolhido in
    ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'));
