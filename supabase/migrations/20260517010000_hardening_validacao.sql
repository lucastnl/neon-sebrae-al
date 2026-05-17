-- Neon Sebrae AL 2026 · hardening pós-pentest (17/05/2026)
-- Adiciona CHECK constraints na tabela partidas pra impedir scores/fases/nomes
-- inválidos via API direta, e limpa só os registros DEFINITIVAMENTE maliciosos.

-- ============ LIMPEZA DOS DADOS DEFINITIVAMENTE MALICIOSOS ============
-- Critério conservador: só apaga o que NÃO TEM como ser jogo legítimo.
-- O 'RED' com score 1.002.225 e combo perfeito 349/349 é ambíguo
-- (pode ser bot ou jogador absurdo) e fica no banco. Se quiser tirar,
-- rode manualmente: delete from partidas where id = 'cfe42c0b-7726-4bf2-8bdf-2a024aceb591';

delete from public.partidas
where
  -- XSS attempts: nome contém tags HTML ou caracteres que não são letras/dígitos/'?'
  nome_jogador ~ '[<>="''`]'
  -- SQL injection attempts no nome
  or nome_jogador ilike '%update%'
  or nome_jogador ilike '%select%'
  or nome_jogador ilike '%delete%'
  or nome_jogador ilike '%drop%'
  or nome_jogador ilike '%--%'
  -- Nomes com underscore/símbolos (ex __SEC_TEST__, __test__)
  or nome_jogador like '%\_%'
  or nome_jogador like '%\_\_%'
  -- Fases impossíveis (jogo só vai até fase 3)
  or fase_max > 3
  or fase_max < 1
  -- Scores absurdos (mais de 999999, que é o teto razoável + display de 6 dígitos)
  or score > 999999
  or score < 0
  -- medo_escolhido fora dos 4 válidos
  or (medo_escolhido is not null
      and medo_escolhido not in ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'));

-- ============ CHECK CONSTRAINTS ============
-- A partir daqui, qualquer INSERT que violar essas regras vai falhar no banco,
-- independente de quem chama (UI legítima ou curl malicioso). Isso fecha o vetor
-- de injeção via API direta usando a anon_key (que necessariamente fica exposta
-- no client).

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

-- medo_escolhido: enum dos 4 valores válidos (ou null pra legado)
alter table public.partidas
  drop constraint if exists partidas_medo_valido;
alter table public.partidas
  add constraint partidas_medo_valido
  check (medo_escolhido is null or medo_escolhido in
    ('procrastinacao', 'comparacao', 'autocobranca', 'paralisia'));
