// neon-store.js, backbone de dados Neon 2026
// Camada única que conversa com Supabase, importada por jogo e dashboard.
// Fallback automático pra localStorage se Supabase falhar (modo offline-friendly).
// IIFE pra isolar o escopo do `let sb`, evitando colisão com a global `supabase` do CDN.

(function () {
const NEON_SUPABASE_URL = 'https://supdxnfogmfjrdkgmrvo.supabase.co';
const NEON_SUPABASE_ANON = 'sb_publishable_Tk9gs3COsOipbZW-w0wa6w_ncI0bt6_';

let sb = null;
let useSupabase = false;

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
  const acertos = Math.max(0, Math.min(9999, Math.floor(Number(partida.acertos) || 0)));
  const comboMax = Math.max(0, Math.min(9999, Math.floor(Number(partida.combo_max) || 0)));
  const MEDOS_VALIDOS = ['procrastinacao', 'comparacao', 'autocobranca', 'paralisia'];
  const medo = MEDOS_VALIDOS.includes(partida.medo_escolhido) ? partida.medo_escolhido : null;
  // Anti-bot: partida tem que ter durado pelo menos 10 segundos. Banco rejeita
  // tambem via CHECK constraint e RLS policy, isso aqui e fail fast no client.
  const duracao = Math.floor(Number(partida.duracao_segundos) || 0);
  if (duracao < 10) {
    return { ok: false, error: 'Partida muito curta (' + duracao + 's). Tempo mínimo: 10s.' };
  }
  if (duracao > 3600) {
    return { ok: false, error: 'Duração inválida (mais de 1h).' };
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
    duracao_segundos: duracao
  };
  console.info('[neon-store] salvando partida', { useSupabase, payload });
  if (useSupabase) {
    const { data, error } = await sb.from('partidas').insert(payload).select();
    if (error) {
      console.error('[neon-store] erro salvando partida no Supabase:', error);
      return { ok: false, error: error.message || JSON.stringify(error) };
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

async function topPartidasGeral(limit) {
  limit = limit || 20;
  if (useSupabase) {
    const { data } = await sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, created_at, caravana_id')
      .eq('em_auditoria', false)
      .order('score', { ascending: false })
      .limit(limit);
    return data || [];
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  return partidas.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function ultimasPartidas(limit) {
  limit = limit || 10;
  if (useSupabase) {
    const { data } = await sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, created_at, caravana_id')
      .eq('em_auditoria', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
  const partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
  return partidas
    .slice()
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, limit);
}

async function estatisticasGerais() {
  // Calcula stats agregadas pra view de INSIGHTS no dashboard.
  // 61 partidas hoje, mas pode escalar pra milhares no evento real.
  // Tudo client-side: o volume é pequeno e Supabase free não tem RPC fácil.
  let partidas;
  if (useSupabase) {
    const { data } = await sb
      .from('partidas')
      .select('nome_jogador, score, fase_max, medo_escolhido, acertos, combo_max, created_at')
      .eq('em_auditoria', false);
    partidas = data || [];
  } else {
    partidas = JSON.parse(localStorage.getItem('neon-partidas-local') || '[]');
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
  init: initStore,
  isUsingSupabase: () => useSupabase,
  getCaravanaAtiva,
  criarNovaCaravana,
  encerrarCaravanaAtiva,
  listarHistoricoCaravanas,
  salvarPartida,
  topPartidasGeral,
  ultimasPartidas,
  estatisticasGerais,
  topPartidasCaravanaAtiva,
  rankingCaravanas,
  subscribeNovasPartidas,
  resetarTudo
};
})();
