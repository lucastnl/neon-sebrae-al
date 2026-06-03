# Retratos 16-bit · Acende a Centelha

Spec pra gerar os 3 retratos pixel-art das pistas locais do jogo. Geração num gerador de imagem (Midjourney, DALL-E, SDXL com LoRA de pixel art, etc.), entrega como PNG, e eu encaixo no jogo (a fiação já está pronta com fallback).

## Onde os arquivos vão
Salvar exatamente assim (o jogo já procura por esses caminhos):

```
assets/centelha/hermeto.png
assets/centelha/graciliano.png
assets/centelha/marta.png
```

(pasta a criar: `boss-fight/assets/centelha/`)

## Especificação técnica (vale pros 3)
- **Formato:** PNG com **fundo transparente** (sem cenário, só o busto recortado).
- **Tamanho de entrega:** 512x512 px, quadrado. No jogo aparece pequeno (~54px) com `image-rendering:pixelated`, então a baixa resolução do pixel art é proposital.
- **Enquadramento:** busto (ombros pra cima), leve 3/4, olhando pra câmera. Os 3 no MESMO enquadramento e escala pra formarem um conjunto coeso.
- **Estilo:** pixel art 16-bit (era SNES / Mega Drive). Contorno escuro limpo, paleta limitada porém rica, sombreado com dithering suave. Nada de anti-aliasing borrado, nada de foto-realismo.
- **Cor:** tons de pele e cabelo naturais e reconhecíveis, com um leve rim light neon (ciano de um lado, magenta do outro) só na borda, pra casar com a sala do jogo. O rosto fica natural, o neon é só o respingo nas bordas.
- **Tom:** homenagem digna, retrato heroico de "card colecionável". NÃO caricatura, NÃO chacota.
- **Negativos (evitar):** texto, marca d'água, moldura, fundo, mãos, corpo inteiro, deformação de rosto.

## Prompts por figura (ajuste fino no gerador da sua escolha)

### hermeto.png · Hermeto Pascoal
> 16-bit SNES-style pixel art bust portrait, transparent background. An elderly Brazilian musician with long flowing white hair and a thick long white beard, fair skin, round glasses, serene joyful expression. Vibrant, slightly colorful clothing. Clean dark outline, limited rich palette, soft dithered shading, subtle cyan-and-magenta neon rim light on the edges only. Dignified homage portrait, collectible card look. No text, no frame, no background.

Atributos-âncora (pra ficar reconhecível): cabelo e barba brancos longos e fartos, óculos, ar de gênio gentil. (Hermeto é albino, pele e cabelos claros, retratar com respeito.)

### graciliano.png · Graciliano Ramos
> 16-bit SNES-style pixel art bust portrait, transparent background. A serious, austere Brazilian writer from the 1930s, lean face, dark hair parted to the side, thin mustache, round glasses, formal suit and tie, intense thoughtful gaze. Clean dark outline, limited rich palette, soft dithered shading, subtle cyan-and-magenta neon rim light on the edges only. Dignified homage portrait, collectible card look. No text, no frame, no background.

Atributos-âncora: magro, sério, óculos redondos, bigode fino, terno e gravata, vibe anos 1930-40.

### marta.png · Marta Vieira da Silva
> 16-bit SNES-style pixel art bust portrait, transparent background. A confident young Brazilian woman football player, hair pulled back in a ponytail or bun, wearing a yellow national team jersey, determined proud smile. Clean dark outline, limited rich palette, soft dithered shading, subtle cyan-and-magenta neon rim light on the edges only. Dignified heroic homage portrait, collectible card look. No text, no frame, no background.

Atributos-âncora: atleta jovem, cabelo preso, camisa amarela, expressão confiante. (Evitar número/escudo de marca registrada pra não ter problema de direitos.)

## Pose de ação (a "aparição" no jogo)
Cada fazedor agora MOVE uma estação e aparece em 16-bit quando você resolve ela, ligando o talento dele à competência. Então a pose pede a ação característica:
- **hermeto.png** (move a energia / fusíveis): tocando flauta. Frase no jogo: "A criatividade do Hermeto religou a luz."
- **graciliano.png** (move o cofre): escrevendo ou segurando um livro. Frase: "O método do Graciliano abriu o cofre."
- **marta.png** (move a fechadura): com a bola, chutando ou dominando. Frase: "A perseverança da Marta arrombou a porta."

Se der pra entregar um sprite com 2-3 quadros de animação (ex: Marta dominando a bola), melhor ainda; mando o loop no jogo. Se for PNG único, também funciona (entra com um leve movimento de respiro). Mesma spec técnica acima pros 3.

## Depois de gerar
1. Joga os 3 PNGs em `boss-fight/assets/centelha/` com os nomes exatos.
2. Avisa que estão lá. Eu confirmo que aparecem no "vasculhar" (substituem os emojis 📻 📖 ⚽ automaticamente) e ajusto tamanho/posição se precisar.

## Nota de direito e respeito
São pessoas reais (Marta viva, Hermeto faleceu há pouco, Graciliano histórico). Num material do Sebrae, usar a imagem deles como homenagem educativa costuma ser tranquilo, mas vale alinhar com o Sebrae no fechamento do acervo (que já é curadoria conjunta). Se algum não puder, troca por outro fazedor alagoano da lista (Djavan, Delmiro Gouveia, etc.) com o mesmo spec.
