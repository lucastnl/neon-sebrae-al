// neon-store.js, backbone de dados Neon 2026
// Camada única que conversa com Supabase, importada por jogo e dashboard.
// Fallback automático pra localStorage se Supabase falhar (modo offline-friendly).

const NEON_SUPABASE_URL = 'https://supdxnfogmfjrdkgmrvo.supabase.co';
const NEON_SUPABASE_ANON = 'sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_';

let supabase = null;
let useSupabase = false;

async function initStore() {
  try {
    if (typeof window.supabase === 'undefined') {
      console.warn('[neon-store] supabase-js nao carregado, usando localStorage');
      return false;
    }
    supabase = window.supabase.createClient(NEON_SUPABASE_URL, NEON_SUPABASE_ANON, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    const { error } = await supabase.from('caravanas').select('id').limit(1);
    if (error) {
      console.warn('[neon-store] supabase indisponivel:', error.message, ', caindo pra localStorage');
      supabase = null;
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
    const { data } = await supabase
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
    const { data: last } = await supabase
      .from('caravanas')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle();
    const numero = (last?.numero || 0) + 1;
    const { data, error } = await supabase
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
    await supabase
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
    const { data } = await supabase
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
  const caravana = await getCaravanaAtiva();
  const payload = {
    caravana_id: caravana.id,
    jogo: partida.jogo || 'monstro-proximo-passo',
    nome_jogador: partida.nome_jogador,
    score: partida.score,
    fase_max: partida.fase_max,
    medo_escolhido: partida.medo_escolhido,
    acertos: partida.acertos || 0,
    combo_max: partida.combo_max || 0
  };
  if (useSupabase) {
    const { error } = await supabase.from('partidas').insert(payload);
    if (error) console.error('[neon-store] erro salvando partida:', error);
    return !error;
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  partidas.push({ ...payload, id: 'p-' + Date.now(), created_at: new Date().toISOString() });
  localStorage.setItem('neon-partidas-local', JSON.stringify(partidas));
  return true;
}

async function topPartidasCaravanaAtiva(limit) {
  limit = limit || 5;
  const caravana = await getCaravanaAtiva();
  if (useSupabase) {
    const { data } = await supabase
      .from('partidas')
      .select('nome_jogador, score, fase_max, created_at')
      .eq('caravana_id', caravana.id)
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
    const { data } = await supabase
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
  const channel = supabase
    .channel('partidas-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'partidas' }, payload => {
      callback(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ============ RESET (operador) ============

async function resetarTudo() {
  if (useSupabase) {
    await supabase.from('partidas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('caravanas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    return await criarNovaCaravana();
  }
  localStorage.removeItem('neon-caravana-ativa');
  localStorage.removeItem('neon-caravanas-historico');
  localStorage.removeItem('neon-partidas-local');
  return await criarNovaCaravana();
}

// ============ EXPORT ============
window.NeonStore = {
  init: initStore,
  isUsingSupabase: () => useSupabase,
  getCaravanaAtiva,
  criarNovaCaravana,
  encerrarCaravanaAtiva,
  listarHistoricoCaravanas,
  salvarPartida,
  topPartidasCaravanaAtiva,
  rankingCaravanas,
  subscribeNovasPartidas,
  resetarTudo
};
