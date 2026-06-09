// Playtest headless via Chrome DevTools Protocol (Node 22, WebSocket nativo).
import { writeFileSync } from 'node:fs';
const PORT = 9222, BASE = 'http://localhost:8799';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function pageWS() {
  for (let i = 0; i < 30; i++) {
    try {
      const list = await (await fetch(`http://localhost:${PORT}/json`)).json();
      const pg = list.find(t => t.type === 'page');
      if (pg?.webSocketDebuggerUrl) return pg.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error('sem target page');
}

let id = 0; const pending = new Map(); const errors = [];
function send(ws, method, params = {}) {
  const mid = ++id;
  ws.send(JSON.stringify({ id: mid, method, params }));
  return new Promise((res) => pending.set(mid, { res }));
}

async function main() {
  const game = process.argv[2];
  const url = game === 'monstro'
    ? `${BASE}/jogos/monstro-proximo-passo/`
    : `${BASE}/jogos/acende-a-centelha/`;
  const ws = new WebSocket(await pageWS());
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', evt => {
    const m = JSON.parse(evt.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      const e = m.params.exceptionDetails;
      errors.push('EXCEPTION: ' + (e.exception?.description || e.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console.error: ' + m.params.args.map(a => a.value || a.description || '').join(' '));
    }
  });
  await send(ws, 'Page.enable'); await send(ws, 'Runtime.enable');

  const ev = async expr => (await send(ws, 'Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
  const shot = async name => {
    const { data } = await send(ws, 'Page.captureScreenshot', { format: 'png' });
    writeFileSync(`/tmp/pt_${game}_${name}.png`, Buffer.from(data, 'base64'));
  };
  const clickXY = async (x, y) => {
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  };
  const rectOf = sel => ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,v:r.width>0&&r.height>0};})()`);
  const clickSel = async sel => { const r = await rectOf(sel); if (!r || !r.v) return false; await clickXY(r.x, r.y); return true; };

  const waitSel = async (sel, ms) => { for (let i = 0; i < (ms || 4000) / 100; i++) { const r = await rectOf(sel); if (r && r.v) return true; await sleep(100); } return false; };

  const log = [];
  await send(ws, 'Page.navigate', { url });
  await sleep(1500);

  const jsClick = async sel => await ev(`(()=>{var e=document.querySelector(${JSON.stringify(sel)});if(e){e.click();return true}return false})()`);
  if (game === 'forja') {
    await shot('01_intro');
    log.push('START: ' + await jsClick('#startBtn')); await sleep(700);
    log.push('entrou no jogo (opcoes visiveis): ' + await waitSel('#opts .opt'));
    let rounds = 0;
    for (let r = 0; r < 8; r++) {
      if (!await waitSel('#opts .opt', 3000)) break;
      // escolhe uma opcao (a primeira disponivel)
      await ev(`(()=>{var b=document.querySelector('#opts .opt:not(.dim)');if(b)b.click();})()`);
      rounds++;
      if (r === 1) await shot('02_round');
      await sleep(1400);
    }
    log.push('rodadas jogadas: ' + rounds);
    const sc = await ev(`(()=>{var e=document.querySelector('#score');return e?e.textContent.trim():''})()`);
    log.push('score apos jogar: "' + sc + '" (sobe se as forjas pontuaram)');
    // espera o fim (pavio) ou forca: deixa rodar ate acabar o tempo seria 90s; checa estado parcial
    await shot('03_midgame');
  }

  if (game === 'centelha') {
    await shot('01_intro');
    log.push('START: ' + await clickSel('#startBtn')); await sleep(700);
    log.push('disjuntor: ' + await clickSel('#disjuntor')); await sleep(700);
    log.push('hermeto intro: ' + await ev(`document.querySelector('#ov').classList.contains('up')`));
    log.push('DESTRAVAR: ' + await clickSel('#mkGo')); await sleep(600);
    await shot('04_circuit');
    // solver: le os masks do SVG, acha quantas rotacoes cada tile precisa, e clica de verdade
    const plan = await ev(`(()=>{const tiles=[...document.querySelectorAll('#circuit .tile')];if(tiles.length!==9)return null;
      const maskOf=t=>{let m=0;t.querySelectorAll('line').forEach(l=>{const x2=+l.getAttribute('x2'),y2=+l.getAttribute('y2');if(x2===12&&y2===0)m|=1;if(x2===24&&y2===12)m|=2;if(x2===12&&y2===24)m|=4;if(x2===0&&y2===12)m|=8;});return m;};
      const base=tiles.map(maskOf),rot=m=>((m<<1)|(m>>3))&15,sr=1,DIRS=[[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]];
      const won=masks=>{const pw=Array(9).fill(false),q=[],src=sr*3;if(masks[src]&8){pw[src]=true;q.push(src);}while(q.length){const cur=q.shift(),r=(cur/3|0),c=cur%3,m=masks[cur];DIRS.forEach(d=>{if(m&d[0]){const nr=r+d[1],nc=c+d[2];if(nr>=0&&nr<3&&nc>=0&&nc<3){const ni=nr*3+nc;if(!pw[ni]&&(masks[ni]&d[3])){pw[ni]=true;q.push(ni);}}}});}const dst=sr*3+2;return pw[dst]&&(masks[dst]&2);};
      const rots=base.map(m=>{const a=[m];for(let i=0;i<3;i++)a.push(rot(a[a.length-1]));return a;});
      const r=Array(9).fill(0);const rec=i=>{if(i===9)return won(r.map((ri,idx)=>rots[idx][ri]));for(let ri=0;ri<4;ri++){r[i]=ri;if(rec(i+1))return true;}r[i]=0;return false;};
      return rec(0)?r:null;})()`);
    let solved = false;
    if (plan) {
      const tiles = await ev(`[...document.querySelectorAll('#circuit .tile')].map(t=>{const r=t.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})`);
      for (let i = 0; i < 9; i++) for (let k = 0; k < plan[i]; k++) { await clickXY(tiles[i].x, tiles[i].y); await sleep(40); }
      solved = await ev(`document.querySelector('#dst')?.classList.contains('on')||false`);
    }
    log.push('circuito resolvido pelo solver (cliques reais): ' + solved);
    await sleep(1300); await shot('05_lit');
    log.push('sala acendeu (room.lit): ' + await ev(`document.querySelector('#room').classList.contains('lit')`));
    const waitFree = async () => { for (let i = 0; i < 50; i++) { const b = await ev(`document.querySelector('#ov').classList.contains('up')||document.querySelector('#aparicao').classList.contains('show')`); if (!b) return; await sleep(120); } };
    await waitFree();
    log.push('cofre: ' + await clickSel('#cofre')); await sleep(500);
    log.push('graciliano intro abriu: ' + await ev(`document.querySelector('#ov').classList.contains('up')`));
    await clickSel('#mkGo'); await sleep(600); await shot('06_ordem');
    const order = await ev(`(()=>{const asc=document.querySelector('#ov .ovd')?.textContent.includes('mais antigo pro mais novo');const cards=[...document.querySelectorAll('#ov .ord-card')].map(c=>{const r=c.getBoundingClientRect();return {ano:+c.querySelector('.oc-ano').textContent,x:r.left+r.width/2,y:r.top+r.height/2}});cards.sort((a,b)=>asc?a.ano-b.ano:b.ano-a.ano);return {asc,cards};})()`);
    log.push('ordem asc=' + order.asc + ' anos=' + order.cards.map(c => c.ano).join(','));
    for (const c of order.cards) { await clickXY(c.x, c.y); await sleep(250); }
    await sleep(900);
    await waitFree();
    log.push('cofre aberto: ' + await ev(`document.querySelector('#cofre')?.classList.contains('open')||false`));
    log.push('porta: ' + await clickSel('#porta')); await sleep(500);
    log.push('marta intro abriu: ' + await ev(`document.querySelector('#ov').classList.contains('up')`));
    await clickSel('#mkGo'); await sleep(600); await shot('08_fechadura');
    let pins = 0, tries = 0;
    while (pins < 3 && tries < 600) {
      tries++;
      const st = await ev(`(()=>{const t=document.querySelector('#tumblers .tumb:not(.locked)');const L=document.querySelectorAll('#tumblers .tumb.locked').length;if(!t)return {locked:L,hit:false};const z=t.querySelector('.zone'),m=t.querySelector('.mark');const zl=parseFloat(z.style.left),zw=parseFloat(z.style.width),ml=parseFloat(m.style.left);return {locked:L,hit:(ml>=zl+1&&ml<=zl+zw-1)};})()`);
      pins = st.locked;
      if (st.hit) { await clickSel('#travarBtn'); await sleep(80); }
    }
    log.push('fechadura pinos travados: ' + pins);
    await sleep(2000); await shot('09_pride');
    log.push('pride screen visivel: ' + await ev(`!document.querySelector('#screenPride')?.classList.contains('hidden')`));
    if (await clickSel('.pride-pick')) { await sleep(700); await shot('10_reveal'); await clickSel('#prideGo'); await sleep(700); }
    log.push('end card visivel: ' + await ev(`!document.querySelector('#screenEnd')?.classList.contains('hidden')`));
    await shot('11_end');
    log.push('replay: ' + await clickSel('#replayBtn')); await sleep(700);
    log.push('replay reiniciou no escuro: ' + await ev(`!document.querySelector('#room').classList.contains('lit')`));
  }

  if (game === 'monstro') {
    await shot('01_intro');
    log.push('COMECAR: ' + (await clickSel('#btn-start') || await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/come|jogar|start/i.test(x.textContent));if(b){b.click();return true}return false})()`)));
    await sleep(1200);
    // dirige tutorial + jogo pelo state global: clica o antidoto do bloco mais urgente
    let destroyed0 = -1, lastScore = '';
    for (let i = 0; i < 44; i++) {
      const info = await ev(`(()=>{try{
        if(typeof state==='undefined')return {err:'sem state'};
        const blocks=(state.fallingBlocks||[]).filter(b=>!b.destroyed).sort((a,b)=>b.y-a.y);
        const res=blocks.length?blocks[0].resource:null;
        const sc=(document.querySelector('#score-val,#score,.score-value,.hud-score')||{}).textContent||'';
        return {mode:state.mode,n:blocks.length,res,score:sc,killed:state.killed||state.destroyedCount||0};
      }catch(e){return {err:e.message}}})()`);
      if (info?.err) { log.push('monstro: ' + info.err); break; }
      lastScore = info.score;
      if (info.res) await clickSel(`.action-btn[data-action="${info.res}"]`);
      else { // tutorial sem bloco mapeado: clica botao destacado ou qualquer acao
        await ev(`(()=>{const b=document.querySelector('.action-btn.highlight')||document.querySelector('#tut-skip')||document.querySelector('.action-btn');if(b)b.click();})()`);
      }
      if (i === 3) destroyed0 = info.killed;
      if (i === 6) await shot('03_play');
      await sleep(350);
    }
    await shot('04_midgame');
    const fin = await ev(`(()=>{try{return {mode:state.mode,killed:state.killed||state.destroyedCount||'n/a',score:state.score||'n/a'}}catch(e){return {err:e.message}}})()`);
    log.push('estado final: ' + JSON.stringify(fin));
    log.push('colisao validada (jogo saiu do tutorial e/ou pontuou): mode=' + fin.mode + ' score=' + fin.score);
    await sleep(800); await shot('05_after');
  }

  log.push('=== ERROS DE CONSOLE/EXCEPTIONS: ' + (errors.length ? '\n  ' + errors.join('\n  ') : 'NENHUM'));
  console.log('--- PLAYTEST ' + game.toUpperCase() + ' ---\n' + log.join('\n'));
  ws.close();
}
main().catch(e => { console.error('FALHA:', e.message); process.exit(1); });
