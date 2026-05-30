// neon-store.js, backbone de dados Neon 2026
// Camada única que conversa com Supabase, importada por jogo e dashboard.
// Fallback automático pra localStorage se Supabase falhar (modo offline-friendly).
// IIFE pra isolar o escopo do `let sb`, evitando colisão com a global `supabase` do CDN.

(function () {
const NEON_SUPABASE_URL = 'https://supdxnfogmfjrdkgmrvo.supabase.co';
const NEON_SUPABASE_ANON = 'sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_';

let sb = null;
let useSupabase = false;

// Device ID: UUID v4 gerado uma vez por browser, persistido em localStorage.
// Não identifica pessoa (totalmente anônimo, LGPD-friendly), só permite cruzar
// partidas do mesmo dispositivo. Útil pra detectar bot que tenta vários nomes.
function getDeviceId() {
  const KEY = 'neon-device-id-v1';
  let id = localStorage.getItem(KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Fallback pra browsers antigos: gera UUID v4 manualmente
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(KEY, id);
  }
  return id;
}
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function initStore() {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('[neon-store] supabase-js nao carregado, usando localStorage');
      return false;
    }
    sb = window.supabase.createClient(NEON_SUPABASE_URL, NEON_SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    const { error } = await sb.from('caravanas').select('id').limit(1);
    if (error) {
      console.warn('[neon-store] supabase indisponivel:', error.message, ', caindo pra localStorage');
      sb = null;
      return false;
    }
    useSupabase = true;
    console.info('[neon-store] supabase conectado');
    return true;
  } catch (err) {
    console.warn('[neon-store] erro inicializando supabase:', err);
    return false;
  }
}

// ============ CARAVANAS ============

async function getCaravanaAtiva() {
  if (useSupabase) {
    const { data } = await sb
      .from('caravanas')
      .select('*')
      .eq('ativa', true)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
    return await criarNovaCaravana();
  }
  const stored = localStorage.getItem('neon-caravana-ativa');
  if (stored) return JSON.parse(stored);
  const nova = { id: 'local-1', numero: 1, ativa: true, iniciada_em: new Date().toISOString() };
  localStorage.setItem('neon-caravana-ativa', JSON.stringify(nova));
  return nova;
}

async function criarNovaCaravana() {
  if (useSupabase) {
    const { data: last } = await sb
      .from('caravanas')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    const numero = (last?.numero || 0) + 1;
    const { data, error } = await sb
      .from('caravanas')
      .insert({ numero, ativa: true })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const atual = await getCaravanaAtiva();
  const numero = atual.numero + 1;
  const nova = { id: 'local-' + numero, numero, ativa: true, iniciada_em: new Date().toISOString() };
  localStorage.setItem('neon-caravana-ativa', JSON.stringify(nova));
  return nova;
}

async function encerrarCaravanaAtiva() {
  if (useSupabase) {
    const atual = await getCaravanaAtiva();
    await sb
      .from('caravanas')
      .update({ ativa: false, encerrada_em: new Date().toISOString() })
      .eq('id', atual.id);
    return await criarNovaCaravana();
  }
  const atual = await getCaravanaAtiva();
  const historico = JSON.parse(localStorage.getItem('neon-caravanas-historico') || '[]');
  historico.push({ ...atual, encerrada_em: new Date().toISOString() });
  localStorage.setItem('neon-caravanas-historico', JSON.stringify(historico));
  return await criarNovaCaravana();
}

async function listarHistoricoCaravanas() {
  if (useSupabase) {
    const { data } = await sb
      .from('ranking_caravanas')
      .select('*')
      .eq('ativa', false)
      .order('encerrada_em', { ascending: false });
    return data || [];
  }
  return JSON.parse(localStorage.getItem('neon-caravanas-historico') || '[]');
}

// ============ PARTIDAS ============

async function salvarPartida(partida) {
  // Validação defensiva no client antes de chamar a API.
  // Mesmo que alguém contorne a UI, o banco tem CHECK constraints e RLS WITH CHECK.
  // Aqui é a primeira barreira: fail fast com mensagem útil.
  const nome = String(partida.nome_jogador || '').toUpperCase().slice(0, 3);
  if (!/^[A-Z?]{3}$/.test(nome)) {
    return { ok: false, error: 'Nome deve ter 3 letras maiúsculas (A-Z)' };
  }
  const score = Math.floor(Number(partida.score) || 0);
  if (score < 0 || score > 999999) {
    return { ok: false, error: 'Score fora do intervalo permitido (0-999999)' };
  }
  const fase = Math.floor(Number(partida.fase_max) || 1);
  if (fase < 1 || fase > 3) {
    return { ok: false, error: 'Fase inválida (1-3)' };
  }
  // Limites ampliados (era 9999, virou 99999) pra cobrir partidas longas em
  // fase 3 infinita. Bot ainda nao passa porque outras camadas pegam (RLS de
  // duracao 10-7200s, score 999999, regex de nome, device_id obrigatorio).
  const acertos = Math.max(0, Math.min(99999, Math.floor(Number(partida.acertos) || 0)));
  const comboMax = Math.max(0, Math.min(99999, Math.floor(Number(partida.combo_max) || 0)));
  const MEDOS_VALIDOS = ['procrastinacao', 'comparacao', 'autocobranca', 'paralisia'];
  const medo = MEDOS_VALIDOS.includes(partida.medo_escolhido) ? partida.medo_escolhido : null;
  // Anti-bot: partida tem que ter durado pelo menos 10 segundos. Banco rejeita
  // tambem via CHECK constraint e RLS policy, isso aqui e fail fast no client.
  const duracao = Math.floor(Number(partida.duracao_segundos) || 0);
  if (duracao < 10) {
    return { ok: false, error: 'Partida muito curta (' + duracao + 's). Tempo mínimo: 10s.' };
  }
  if (duracao > 14400) {
    return { ok: false, error: 'Duração inválida (mais de 4h).' };
  }
  // Device ID: identifica dispositivo (não pessoa). Permite cruzar partidas do
  // mesmo browser mesmo se o nome muda. Útil pra auditoria de bot/multinick.
  const deviceId = getDeviceId();
  if (!UUID_V4.test(deviceId)) {
    return { ok: false, error: 'Device ID inválido.' };
  }

  const caravana = await getCaravanaAtiva();
  const payload = {
    caravana_id: caravana.id,
    jogo: 'monstro-proximo-passo',
    nome_jogador: nome,
    score: score,
    fase_max: fase,
    medo_escolhido: medo,
    acertos: acertos,
    combo_max: comboMax,
    duracao_segundos: duracao,
    device_id: deviceId
  };
  console.info('[neon-store] salvando partida', { useSupabase, payload });
  if (useSupabase) {
    const { data, error } = await sb.from('partidas').insert(payload).select();
    if (error) {
      // Preserva a partida em localStorage como "órfã" pra Lucas reenviar depois,
      // assim nenhuma jogada legítima se perde por RLS/CHECK rejeitando.
      // Log full payload no console pra recuperação manual também (cole no SQL).
      const orfa = { ...payload, _erro: error.message, _rejeitada_em: new Date().toISOString() };
      try {
        const orfas = JSON.parse(localStorage.getItem('neon-partidas-orfas') || '[]');
        orfas.push(orfa);
        localStorage.setItem('neon-partidas-orfas', JSON.stringify(orfas));
      } catch (e) { /* localStorage cheio: paciência */ }
      console.error('[neon-store] PARTIDA REJEITADA pelo Supabase. Payload preservado:', orfa);
      return { ok: false, error: error.message || JSON.stringify(error), preservada: true };
    }
    console.info('[neon-store] partida salva no Supabase:', data);
    return { ok: true, data };
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  partidas.push({ ...payload, id: 'p-' + Date.now(), created_at: new Date().toISOString() });
  localStorage.setItem('neon-partidas-local', JSON.stringify(partidas));
  console.info('[neon-store] partida salva em localStorage (fallback)');
  return { ok: true, data: payload };
}

async function topPartidasGeral(limit, caravanaId) {
  // Top jogadores. Se caravanaId vier, escopa só naquela caravana (turma da vez
  // no placar); sem ele, soma o evento inteiro.
  limit = limit || 20;
  if (useSupabase) {
    let q = sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, created_at, caravana_id')
      .eq('em_auditoria', false);
    if (caravanaId) q = q.eq('caravana_id', caravanaId);
    const { data } = await q.order('score', { ascending: false }).limit(limit);
    return data || [];
  }
  let partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  if (caravanaId) partidas = partidas.filter(p => p.caravana_id === caravanaId);
  return partidas.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function ultimasPartidas(limit, caravanaId) {
  // Sem caravanaId: últimas jogadas do evento inteiro (feed ao vivo).
  // Com caravanaId: últimas jogadas só daquela caravana (ticker do snapshot histórico).
  limit = limit || 10;
  if (useSupabase) {
    let q = sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, created_at, caravana_id')
      .eq('em_auditoria', false);
    if (caravanaId) q = q.eq('caravana_id', caravanaId);
    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  let partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  if (caravanaId) partidas = partidas.filter(p => p.caravana_id === caravanaId);
  return partidas
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit);
}

async function estatisticasGerais(caravanaId) {
  // Calcula stats agregadas pra view de INSIGHTS no dashboard.
  // 61 partidas hoje, mas pode escalar pra milhares no evento real.
  // Tudo client-side: o volume é pequeno e Supabase free não tem RPC fácil.
  // Se caravanaId vier, escopa só naquela caravana (placar por turma da vez).
  let partidas;
  if (useSupabase) {
    let q = sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, acertos, combo_max, created_at')
      .eq('em_auditoria', false);
    if (caravanaId) q = q.eq('caravana_id', caravanaId);
    const { data } = await q;
    partidas = data || [];
  } else {
    partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
    if (caravanaId) partidas = partidas.filter(p => p.caravana_id === caravanaId);
  }
  if (partidas.length === 0) {
    return { total: 0, jogadoresUnicos: 0, totalAcertos: 0, melhorCombo: 0,
             scoreMedio: 0, jogadoresPersistentes: [], rankingIndividual: [], medosDistr: [] };
  }
  const total = partidas.length;
  const totalAcertos = partidas.reduce((s, p) => s + (p.acertos || 0), 0);
  const melhorCombo = partidas.reduce((m, p) => Math.max(m, p.combo_max || 0), 0);
  const scoreMedio = Math.round(partidas.reduce((s, p) => s + (p.score || 0), 0) / total);

  // Agrupa por jogador
  const porJogador = {};
  partidas.forEach(p => {
    const nome = p.nome_jogador || '???';
    if (!porJogador[nome]) {
      porJogador[nome] = { nome, partidas: 0, melhorScore: 0, totalScore: 0 };
    }
    porJogador[nome].partidas++;
    porJogador[nome].melhorScore = Math.max(porJogador[nome].melhorScore, p.score || 0);
    porJogador[nome].totalScore += (p.score || 0);
  });
  const jogadores = Object.values(porJogador);
  const jogadoresUnicos = jogadores.length;
  const jogadoresPersistentes = jogadores.slice().sort((a, b) => b.partidas - a.partidas);
  const rankingIndividual = jogadores.slice().sort((a, b) => b.melhorScore - a.melhorScore);

  // Distribuição de medos
  const medosCount = {};
  let totalComMedo = 0;
  partidas.forEach(p => {
    if (p.medo_escolhido) {
      medosCount[p.medo_escolhido] = (medosCount[p.medo_escolhido] || 0) + 1;
      totalComMedo++;
    }
  });
  const medosDistr = Object.entries(medosCount)
    .map(([medo, c]) => ({ medo, count: c, pct: totalComMedo ? Math.round(100 * c / totalComMedo) : 0 }))
    .sort((a, b) => b.count - a.count);

  return { total, jogadoresUnicos, totalAcertos, melhorCombo, scoreMedio,
           jogadoresPersistentes, rankingIndividual, medosDistr };
}

async function topPartidasCaravanaAtiva(limit) {
  limit = limit || 5;
  const caravana = await getCaravanaAtiva();
  if (useSupabase) {
    const { data } = await sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, created_at')
      .eq('caravana_id', caravana.id)
      .eq('em_auditoria', false)
      .order('score', { ascending: false })
      .limit(limit);
    return data || [];
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  return partidas
    .filter(p => p.caravana_id === caravana.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============ RANKING (dashboard) ============

async function rankingCaravanas() {
  if (useSupabase) {
    const { data } = await sb
      .from('ranking_caravanas')
      .select('*')
      .order('pontos_totais', { ascending: false });
    return data || [];
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  const ativa = await getCaravanaAtiva();
  const historico = JSON.parse(localStorage.getItem('neon-caravanas-historico') || '[]');
  const todasCaravanas = [ativa, ...historico];
  return todasCaravanas.map(c => ({
    id: c.id,
    numero: c.numero,
    escola: c.escola,
    municipio: c.municipio,
    pontos_totais: partidas.filter(p => p.caravana_id === c.id).reduce((s, p) => s + p.score, 0),
    partidas_jogadas: partidas.filter(p => p.caravana_id === c.id).length,
    ativa: c.ativa
  })).sort((a, b) => b.pontos_totais - a.pontos_totais);
}

function subscribeNovasPartidas(callback) {
  if (!useSupabase) {
    console.warn('[neon-store] realtime indisponivel no fallback localStorage');
    return () => {};
  }
  const channel = sb
    .channel('partidas-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partidas' }, payload => {
      callback(payload.new);
    })
    .subscribe();
  return () => sb.removeChannel(channel);
}

// ============ OPERADOR (ações protegidas por senha) ============

// Chama a função operador_acao no banco, que só executa com a senha certa.
// O poder destrutivo mora no servidor (SECURITY DEFINER), não nesta chave anon,
// então expor isto no client não reabre a CVE-006: sem a senha, o banco recusa.
async function operadorAcao(acao, pin) {
  if (!useSupabase) {
    return { ok: false, error: 'Sem conexão com o banco. Ações de operador exigem o jogo online.' };
  }
  const { data, error } = await sb.rpc('operador_acao', { p_acao: acao, p_pin: pin });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

// ============ RESET (operador) ============

async function resetarTudo() {
  if (useSupabase) {
    await sb.from('partidas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await sb.from('caravanas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return await criarNovaCaravana();
  }
  localStorage.removeItem('neon-caravana-ativa');
  localStorage.removeItem('neon-caravanas-historico');
  localStorage.removeItem('neon-partidas-local');
  return await criarNovaCaravana();
}

// ============ EXPORT ============
window.NeonStore = {
  // Funções leves expostas ao client (não destrutivas).
  init: initStore,
  isUsingSupabase: () => useSupabase,
  getCaravanaAtiva,
  listarHistoricoCaravanas,
  salvarPartida,
  topPartidasGeral,
  ultimasPartidas,
  estatisticasGerais,
  topPartidasCaravanaAtiva,
  rankingCaravanas,
  subscribeNovasPartidas,
  operadorAcao
  // criarNovaCaravana, encerrarCaravanaAtiva, resetarTudo (versões antigas):
  // REMOVIDAS do export público pra fechar CVE-006. Faziam UPDATE/DELETE direto
  // com a chave anon, então qualquer visitante com DevTools derrubava o evento.
  // Encerrar caravana / reset agora passam por operadorAcao(), que chama a função
  // operador_acao no banco: ela exige a senha de operador (hash bcrypt, fora do
  // client) e só aí roda como SECURITY DEFINER. A chave anon segue sem permissão
  // de escrita nas tabelas. Migration: 20260529120000_operador_acoes_protegidas.
};
})();
