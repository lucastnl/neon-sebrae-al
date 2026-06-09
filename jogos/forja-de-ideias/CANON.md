# Cânone do Arcade Neon · o que a Forja de Ideias herda

Destilado de uma revisão dupla (dois revisores independentes) do Monstro e do Centelha, mais o playtest automatizado dos dois (jun/2026). Serve pra construir a Forja consistente, complementar e sem retrabalho. Abreviações: **MON** = monstro-proximo-passo/index.html, **CEN** = acende-a-centelha/index.html.

## Decisão de plataforma (cravada pelo Lucas, jun/2026)
- **Offline total. Sem Supabase, sem CDN externo, sem caravana, sem operador, sem ranking online.**
- **Placar único local na própria máquina** (um high-score pro dia, ou pros 3 dias), guardado em `localStorage`. Nada de mostrar ranking ao vivo.
- A Forja segue o modelo enxuto do Centelha (`#stage` + `localStorage`), NÃO o backend do Monstro. O próprio Monstro está sendo simplificado pra esse mesmo patamar.

## 1. Esqueleto (copiar do CEN)
- `<html lang="pt-BR">`, viewport travado (`user-scalable=no, viewport-fit=cover`), `theme-color #050822`. CEN:1-7.
- **Resolução de design 540x960 (9:16) com scale-to-fit.** Container único (`#stage`) `position:fixed; top/left:50%; width:540px; height:960px; transform:translate(-50%,-50%) scale(var(--fit,1))`. CEN:33. Script de fit no fim do JS: `--fit = min(innerWidth/540, innerHeight/960)`, em `resize`. CEN:712-714. Se medir posições com `getBoundingClientRect`, expor e dividir por `__gscale()` (padrão do MON, senão as contas saem escaladas).
- Reset universal + travas de toque: `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}`, `user-select:none`, `touch-action:none`, `overflow:hidden`, `image-rendering:pixelated`. CEN:29-32.
- Telas como `.screen` absolutas mutuamente exclusivas (intro / jogo / fim), alternadas por classe `.hidden`. CEN:243.
- Console que sobe de baixo (`#ov`) pra interação modal + helpers `openOv/closeOv` + trava `busy()` (não abre duas estações ao mesmo tempo, inclui checar `#aparicao`). CEN:464-471.
- Loop com `requestAnimationFrame` + `dt` por frame + `lose()` no tempo zero. **CLAMPAR o dt** (`dt=Math.min(dt,0.1)`) pra resume de background não matar a partida (bug pego na revisão). Cancelar rAF anterior no `start()` (anti duplo-toque). CEN:454-461, 696.

## 2. Marca "Arcade Neon"
- **Fontes locais** `../../assets/fonts/fonts.css` (Press Start 2P + Space Grotesk). Nunca CDN. CEN:19.
- **Paleta `:root` idêntica** (copiar literal de CEN:22-28): verde, magenta, ciano, azul, amarelo, laranja, vermelho, navy, navy-deep. Fundo `--navy-deep`. Fontes `--mono` (Press Start 2P, HUD/títulos/botões) e `--body` (Space Grotesk, corpo).
- Glow neon: toda label importante com `text-shadow:0 0 Npx var(--cor)`, botões com `box-shadow`.
- **Logo TNL em toda tela** (intro + card de fim), `onerror` pra sumir gracioso. Decidir com o Lucas se entra Sebrae+TNL juntos (vale a mesma decisão pros 3).
- Título em Press Start 2P com sombra colorida em camadas + **uma frase-mantra** que resume a mecânica (Monstro: "derruba os medos e dá o próximo passo"; Centelha: "arromba a sala e acende a centelha"; Forja: algo como "duas ideias soltas viram negócio quando se juntam").
- **Card OG próprio** (`og-forja.jpg`), com `og:url` `/jogos/forja-de-ideias/`, `twitter:card summary_large_image`, dimensões e `alt`. (O Centelha ainda usa o banner genérico, pendência a corrigir.)

## 3. Contrato totem-ready
- 100% toque, zero teclado obrigatório. Captura de nome: **seletor de iniciais com setas ▲▼** (padrão MON, não depende de teclado do SO no kiosk) OU as 3 caixas do CEN. **Padronizar um só pros três.**
- Barra de erro só em `?dev=` (público nunca vê). CEN:376.
- Loop ~90s com replay imediato chamando a mesma `start()`. Botão **VOLTAR AO HUB** `onclick="location.href='/hub/'"` na tela de fim. CEN:368 (o Monstro não tem, pendência).
- **Idle/attract reset**: se ficar parado X segundos em qualquer tela, voltar pra intro (senão um totem abandonado trava a fila). FALTA nos dois, herdar de fábrica na Forja.
- Offline: sprites inline (SVG/div), som por Web Audio (sem arquivos), persistência `localStorage` com try/catch.

## 4. HUD, pontuação, juiciness, fim
- HUD fixo no topo: medidor central próprio do jogo + score amarelo + combo no mesmo canto. (Monstro: 2 barras de HP + timer; Centelha: pavio. **Forja: inventar o seu**, ex. "medidor de sinergia" que sobe ao combinar peças distantes.)
- Pontuação = base + bônus de velocidade + bônus de combo. `addScore` CEN:446. Combo zera no erro (`ok()`/`fail()` CEN:447-448).
- Juiciness reusável (copiar helpers): `shakeIt()`, `flashIt()`, `toast()` CEN:423-425; partículas e popup de pontos MON:565-592.
- Som por Web Audio puro (`beep(freq,dur,type,vol)`), destravado no 1º gesto (herdar o bloco de unlock do MON, é o mais maduro, trata iOS/Android + `visibilitychange`). CEN:410-418 / MON:1786-1813.
- Tela de fim: card com veredito + big number + stats + **gancho educacional** que conecta com o Escalada + CTA de foto/compartilhamento (#ToNoNeon). CEN:661-676 / MON:1537-1597.

## 5. Camada de orgulho local + educacional (o coração)
Padrão do Centelha, **reusar trocando só o conteúdo**: array `FIGS[]` (key/comp/obj/ft/intro/cur) CEN:383-396; `makerIntro()` apresenta o fazedor e amarra competência→mecânica ANTES de jogar CEN:475-484; tela de orgulho final (`prideScreen`/`prideReveal`) onde o jogador escolhe um fazedor e ganha uma curiosidade real CEN:642-660. A Forja precisa da SUA tela de orgulho.
- Acervo a validar com o Sebrae AL (marca CEN:373).

## 6. Matriz de variação (regra dura: a Forja ocupa célula vazia)
| Jogo | Estímulo motor | Competência | Mecânica-núcleo |
|---|---|---|---|
| Monstro | Reflexo / timing | enfrentar medo, agir | apertar o recurso certo antes do bloco bater |
| Centelha | Lógica / dedução | criatividade, método, perseverança | escape room de puzzles encadeados |
| **Forja** | **Combinação / decisão** | **inovação / visão de oportunidade** (a confirmar, distinta das acima) | **juntar/parear/sintetizar peças** |

A Forja **NÃO pode**: ser de reflexo/timing (é do Monstro); ser cadeia de dedução sequencial (é do Centelha); reusar as competências já cravadas (criatividade/método/perseverança e plano/foco/coragem/apoio); reusar Hermeto/Graciliano/Marta (escolher referências alagoanas novas). A Forja **DEVE** herdar todo o resto (esqueleto, marca, contrato totem, HUD, juiciness, tela de orgulho, gancho Escalada). Diverge só na célula motor+competência e na mecânica.

## Pendências de alinhamento dos 3 (anteceder o evento)
1. Decidir e unificar: captura de nome (▲▼ vs caixas), branding (Sebrae+TNL?), OG própria do Centelha.
2. Simplificar o Monstro pro modelo offline/local-único (remover Supabase/caravana/operador).
3. Idle/attract reset nos dois. Volta-pro-hub no Monstro. Cap na Fase 3 infinita do Monstro (fila).
4. Clamp de dt no Centelha. Desligar o detector `debugger` do gotcha do Monstro em produção (falso-positivo assusta visitante). Trocar `alert()/prompt()` do Monstro por toast.
