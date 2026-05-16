# Neon Sebrae Alagoas 2026

Ecossistema digital do espaço **Educação Empreendedora** do Neon Sebrae Alagoas, 11 a 13 de junho de 2026. Reúne jogos arcade do totem, placar ao vivo das caravanas e (em breve) página do método TNL aplicado a jogos.

## Estrutura

```
neon-sebrae-al/
├── index.html                          ← landing page (este repo)
├── jogos/
│   └── monstro-proximo-passo/          ← jogo arcade do totem
├── dashboard/                          ← placar ao vivo (mockup hoje, Supabase Realtime em breve)
├── metodo/                             ← (em construção) Selo 6D TNL aplicado
├── assets/                             ← logo Escalada, shared
├── netlify.toml                        ← redirects amigáveis
└── README.md
```

Rotas amigáveis (Netlify):
- `/` · landing
- `/jogar` ou `/jogar/monstro/` · jogo Monstro do Próximo Passo
- `/dashboard` ou `/placar` · placar ao vivo

## Stack

- HTML/CSS/JS puro, sem build
- Supabase como backbone (em integração)
- Netlify deploy contínuo via GitHub
- Touch-first com fallback teclado

## Operação

No jogo, engrenagem no canto superior direito da tela inicial abre o painel do operador. Código de acesso: `1234`. Permite encerrar a caravana atual, iniciar a próxima, ver histórico e resetar tudo. Storage será via Supabase em breve.

## Identidade visual

Paleta oficial Escalada (`escalada-card-v2`): verde `#00D95C`, magenta `#FF00FF`, ciano `#00F9FF`, azul `#2A4FDA`, navy `#0A0F36`. Tipografia Press Start 2P (retrô) e Space Grotesk (UI).

## Roadmap

- [x] Jogo Monstro do Próximo Passo
- [x] Painel do operador
- [x] Dashboard mockup
- [ ] Schema Supabase (caravanas, partidas, ranking)
- [ ] Jogo conectado ao Supabase (substituir localStorage)
- [ ] Dashboard ao vivo via Supabase Realtime
- [ ] Caça ao Tesouro AR
- [ ] Outros jogos do totem
- [ ] Página do método TNL aplicado
- [ ] Integração Doity (ranking por escola)
- [ ] Pós-evento (Maratona Neon, conexão com Escalada)

Tiro na Lua, 2026
