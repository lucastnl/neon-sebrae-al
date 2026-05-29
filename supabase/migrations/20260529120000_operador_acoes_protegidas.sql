-- Neon Sebrae AL 2026 · religa acoes do operador com senha (29/05/2026)
-- Reabre ENCERRAR CARAVANA e APAGAR TUDO no painel do jogo SEM reabrir a CVE-006.
-- A chave anon continua SEM poder de UPDATE/DELETE direto em caravanas/partidas.
-- Em vez disso, expoe UMA funcao SECURITY DEFINER que so age se receber a senha
-- de operador correta. A senha vive como hash bcrypt numa tabela com RLS fechada,
-- nunca no codigo do client nem legivel via API REST.

create extension if not exists pgcrypto;

-- Guarda o hash da senha do operador. RLS sem policy = anon nao le nem escreve.
-- So a funcao definer (que roda como dono) consegue ler.
create table if not exists public.operador_config (
  id int primary key default 1,
  pin_hash text not null,
  constraint operador_config_singleton check (id = 1)
);
alter table public.operador_config enable row level security;

-- Funcao unica do operador. Roda como dono (bypassa RLS), mas so depois de
-- conferir a senha. Sem senha certa, lanca excecao e nao toca em nada.
create or replace function public.operador_acao(p_acao text, p_pin text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ok boolean;
  v_numero int;
begin
  select (pin_hash = crypt(p_pin, pin_hash)) into v_ok
    from public.operador_config where id = 1;

  if v_ok is not true then
    raise exception 'Senha de operador incorreta';
  end if;

  if p_acao = 'encerrar' then
    -- Encerra a caravana ativa (vai pro historico) e abre a proxima, vazia.
    update public.caravanas set ativa = false, encerrada_em = now() where ativa = true;
    select coalesce(max(numero), 0) + 1 into v_numero from public.caravanas;
    insert into public.caravanas (numero, ativa) values (v_numero, true);
    return json_build_object('acao', 'encerrar', 'nova_caravana', v_numero);

  elsif p_acao = 'limpar_atual' then
    -- Apaga so as partidas da caravana ativa (turma da vez recomeca limpa).
    -- Nao toca nas caravanas anteriores nem na propria caravana ativa.
    delete from public.partidas
      where caravana_id = (select id from public.caravanas where ativa = true);
    return json_build_object('acao', 'limpar_atual');

  elsif p_acao = 'reset' then
    -- Apaga tudo e recomeca da Caravana 01. Nao da pra desfazer.
    delete from public.partidas;
    delete from public.caravanas;
    insert into public.caravanas (numero, ativa) values (1, true);
    return json_build_object('acao', 'reset', 'nova_caravana', 1);

  else
    raise exception 'Acao desconhecida: %', p_acao;
  end if;
end;
$$;

-- anon pode EXECUTAR a funcao (mas ela exige a senha). Nao ganha acesso as tabelas.
revoke all on function public.operador_acao(text, text) from public, anon;
grant execute on function public.operador_acao(text, text) to anon;

-- ============ DEFINIR A SENHA DO OPERADOR ============
-- Rode UMA vez no SQL Editor, trocando 'TROQUE_ESTA_SENHA' pela senha real
-- (use uma senha forte, nao 4 digitos, porque qualquer um pode tentar adivinhar via API):
--
-- insert into public.operador_config (id, pin_hash)
-- values (1, crypt('TROQUE_ESTA_SENHA', gen_salt('bf')))
-- on conflict (id) do update set pin_hash = excluded.pin_hash;
