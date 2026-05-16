# O Monstro do Próximo Passo

Jogo arcade do espaço Educação Empreendedora do **Neon Sebrae Alagoas** (11 a 13 de junho de 2026).

Os 4 medos da Ana Carolina caem do topo da tela. Você usa os 4 recursos do Escalada (Plano, Foco, Coragem, Apoio) pra derrubá-los antes que cheguem no chão. 3 fases (O Vazio, A Subida, O Topo infinito) com curva arcade.

## Estrutura

- `index.html` · jogo completo (HTML + CSS + JS inline, autocontido)
- `logo-escalada.svg` · logo Escalada branca (versão transparente, vinda do KV oficial)
- `logo-escalada.png` · versão PNG (fallback)

## Como rodar local

```bash
open index.html
```

Ou serve com qualquer HTTP server estático.

## Tecnologia

- HTML/CSS/JS puro, sem build
- Web Audio API pra SFX e música chiptune
- localStorage pra ranking (vai virar Supabase quando o evento aproximar)
- Touch-first (totem) com fallback teclado (1234 QWAS)

## Operação

Engrenagem no canto superior direito da tela inicial abre o painel do operador. Código de acesso: `1234`. Permite encerrar a caravana atual e iniciar a próxima, ver histórico, ou resetar tudo.

## Identidade visual

Paleta oficial Escalada (`escalada-card-v2`): verde `#00D95C`, magenta `#FF00FF`, ciano `#00F9FF`, azul `#2A4FDA`, navy `#0A0F36`. Tipografia Press Start 2P (retrô) + Space Grotesk (UI).

## Roadmap

- [ ] Deploy contínuo no Netlify
- [ ] Migrar ranking pra Supabase (entre totens)
- [ ] Integrar nome da escola via Doity (medição por escola)
- [ ] Dashboard de resultados pós-evento
- [ ] Página de design de jogos com método Selo 6D TNL aplicado

Tiro na Lua, 2026
