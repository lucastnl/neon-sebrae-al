-- Neon Sebrae AL 2026 · restringe RLS de caravanas (17/05/2026)
-- Fecha CVE-004 reportado pelo tech lead no QA.
-- Antes: policy "for all using(true) with check(true)" permitia ao anon
-- fazer SELECT + INSERT + UPDATE + DELETE em caravanas.
-- Vetor de ataque: visitante abre DevTools, chama window.NeonStore.resetarTudo()
-- ou encerrarCaravanaAtiva() e DERRUBA o evento ao vivo.
-- Agora: anon só pode SELECT e INSERT (pra criar caravana inicial se não houver).
-- UPDATE/DELETE só com service_role_key (não exposta no client).

-- ============ DROP DA POLICY ATUAL ============

drop policy if exists "caravanas_write_all" on public.caravanas;
drop policy if exists "caravanas_read_all" on public.caravanas;
drop policy if exists "caravanas_select_anon" on public.caravanas;
drop policy if exists "caravanas_insert_anon" on public.caravanas;

-- ============ NOVAS POLICIES RESTRITAS ============

-- SELECT: público (dashboard precisa ler)
create policy "caravanas_select_anon" on public.caravanas
  for select using (true);

-- INSERT: público, mas com validação (operador precisa criar próxima caravana
-- via UI). Valida campos pra evitar caravana fake com escola maliciosa.
create policy "caravanas_insert_anon" on public.caravanas
  for insert
  with check (
    numero between 1 and 9999
    and (escola is null or (length(escola) <= 120 and escola !~ '[<>="''`]'))
    and (municipio is null or (length(municipio) <= 80 and municipio !~ '[<>="''`]'))
    and (quantidade_alunos is null or quantidade_alunos between 1 and 999)
    and ativa = true
    and encerrada_em is null
  );

-- UPDATE/DELETE: SEM POLICY = bloqueado por RLS pra anon.
-- Operações destrutivas (encerrar caravana, reset) precisam ser feitas via:
-- (a) SQL Editor do Supabase (manualmente)
-- (b) Script local com service_role_key (não no client)
-- (c) Edge Function autenticada (futuro)

-- ============ COMO ENCERRAR CARAVANA MANUALMENTE NO EVENTO ============
-- Lucas roda no SQL Editor:
-- update public.caravanas set ativa = false, encerrada_em = now()
--   where ativa = true;
-- insert into public.caravanas (numero, ativa)
--   values ((select coalesce(max(numero), 0) + 1 from public.caravanas), true);
