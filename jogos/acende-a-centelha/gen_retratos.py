#!/usr/bin/env python3
# Gera os 3 retratos 16-bit (PNG transparente) dos fazedores de Alagoas.
# Cada sprite eh desenhado como uma grade ASCII -> escalado nearest-neighbor.
# uv run --with pillow python gen_retratos.py
from PIL import Image
import os

SCALE = 16            # cada "pixel" do sprite vira 16x16
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "centelha")

# paleta compartilhada (char -> RGBA)
PAL = {
    ".": (0, 0, 0, 0),          # transparente
    "o": (22, 16, 28, 255),     # contorno escuro
    # cabelo branco (Hermeto)
    "H": (245, 242, 235, 255),
    "h": (205, 199, 188, 255),
    # cabelo escuro (Graciliano/Marta)
    "D": (54, 40, 60, 255),
    "d": (88, 66, 98, 255),
    # pele clara (Hermeto albino / Graciliano)
    "S": (247, 219, 198, 255),
    "s": (223, 184, 158, 255),
    # pele morena (Marta)
    "B": (180, 120, 86, 255),
    "b": (150, 96, 66, 255),
    # olhos / detalhe escuro
    "e": (40, 28, 44, 255),
    # oculos lente
    "G": (176, 232, 240, 255),
    # boca/nariz sombra
    "n": (200, 150, 122, 255),
    # flauta dourada (Hermeto)
    "F": (224, 176, 72, 255),
    "f": (168, 120, 44, 255),
    # camisa colorida Hermeto
    "A": (255, 93, 162, 255),   # magenta
    "Y": (255, 217, 61, 255),   # amarelo
    "Z": (0, 200, 130, 255),    # verde
    # terno Graciliano
    "K": (38, 34, 60, 255),     # terno escuro
    "k": (58, 54, 86, 255),
    "W": (236, 238, 245, 255),  # gola/camisa branca
    "T": (255, 48, 96, 255),    # gravata
    "L": (216, 178, 96, 255),   # livro capa
    "l": (180, 140, 70, 255),
    # camisa amarela Marta + bola
    "J": (255, 209, 40, 255),   # amarelo selecao
    "j": (224, 176, 24, 255),
    "g": (0, 160, 90, 255),     # detalhe verde escudo
    "P": (244, 244, 248, 255),  # bola branca
    "p": (28, 24, 36, 255),     # bola preto
    # rim light neon (borda)
    "c": (0, 249, 255, 255),    # ciano
    "m": (255, 0, 255, 255),    # magenta
}

def build(name, rows):
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, ".") for r in rows]   # pad a direita pra alinhar
    h = len(rows)
    for i, r in enumerate(rows):
        for ch in r:
            if ch not in PAL:
                raise ValueError(f"{name}: char '{ch}' fora da paleta na linha {i}")
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            px[x, y] = PAL[ch]
    img = img.resize((w * SCALE, h * SCALE), Image.NEAREST)
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, name + ".png"))
    print(f"ok {name}.png  {w*SCALE}x{h*SCALE}")

# ============================ HERMETO ============================
# cabelo + barba brancos fartos, oculos, pele albina, flauta dourada, camisa colorida
HERMETO = [
    "..........................",
    "........mooooooooooc.......",
    ".......oHHHHHHHHHHHHo......",
    "......oHHHHHHHHHHHHHHo.....",
    ".....oHHHHHHHHHHHHHHHHo....",
    ".....oHHHHHHHHHHHHHHHHo....",
    ".....oHHHHhhhhhhhhHHHHo....",
    ".....oHHHSSSSSSSSSSHHHo....",
    ".....oHHSSSSSSSSSSSSHHo....",
    ".....oHHSSSSSSSSSSSSHHo....",
    ".....oHHSSooSSSSooSSHHo....",
    ".....oHHSoGGoSSoGGoSHHo....",
    ".....oHHSoGGoSSoGGoSHHo....",
    ".....cHHSSooSSSSooSSHHm....",
    ".....oHHHSSSSnnSSSSHHHo....",
    ".....oHHHHSSSnnSSSHHHHo....",
    "....FoHHHHSSooooSSHHHHo....",
    "...fFooHHHHHHHHHHHHHHoo....",
    "...fFFoHHHWWWWWWWWHHHo.....",
    "....ffFoHWWWWWWWWWWHo......",
    ".....ffoHWWWWWWWWWWHo......",
    "......foHHWWWWWWWWHHo......",
    ".......oHHHWWWWWWHHHo......",
    "........oHHHHHHHHHHo.......",
    ".......oAAAAAAAAAAAAo......",
    "......oAAAYYYAAYYYAAAo.....",
    "......oAAYYAAZZAAYYAAo.....",
    "......oAAAAZZZZZZAAAAo.....",
    "......oAAAAAAAAAAAAAAo.....",
    ".......ooooooooooooo......."
]

# ============================ GRACILIANO ============================
# cabelo escuro repartido, oculos redondos, bigode fino, terno + gravata, livro
GRACILIANO = [
    "..........................",
    "........moooooooooc........",
    ".......oDDDDDDDDDDDDo......",
    "......oDDDDDDDDDDDDDDo.....",
    ".....oDDDDDDDDDDDDDDDDo....",
    ".....oDDDDDDDdDDDDDDDDo....",
    ".....oDDSSSSSdSSSSSSDDo....",
    ".....oDSSSSSSdSSSSSSSDo....",
    ".....oSSSSSSSSSSSSSSSSo....",
    ".....oSSSSSSSSSSSSSSSSo....",
    ".....oSSSooSSSSSSooSSSo....",
    ".....cSSoGGoSSSSoGGoSSm....",
    ".....oSSoGGoSSSSoGGoSSo....",
    ".....oSSSooSSSSSSooSSSo....",
    ".....oSSSSSSSnnSSSSSSSo....",
    ".....oSSSSSeeeeeeSSSSSo....",
    ".....oSSSSSSSooSSSSSSSo....",
    ".....oSSSSSSSSSSSSSSSSo....",
    "......oSSSSSSSSSSSSSSo.....",
    ".......ooSSSSSSSSSSoo......",
    "........oWWoooooWWo........",
    ".......oKWWWWTTWWWWKo......",
    "......oKKKWWWTTWWWKKKo.....",
    ".....oKKKKKWWTTWWKKKKKo....",
    "....oKKKKKKKWTTWKKKKKKKo...",
    "....oKKKKKKKKTTKKKKKKKKo...",
    "....oKKKKLLLLLLLLLLKKKKo...",
    "....oKKKLlllllllllLKKKKo...",
    "....oKKKLLLLLLLLLLLLKKKo...",
    ".....oooooooooooooooooo...."
]

# ============================ MARTA ============================
# cabelo preso (rabo), pele morena, camisa amarela da selecao, bola
MARTA = [
    "..........................",
    ".........moooooooc........",
    "........oDDDDDDDDDDo.......",
    ".......oDDDDDDDDDDDDo......",
    "......oDDDDDDDDDDDDDDoo....",
    "......oDDDDDDDDDDDDDDDDo...",
    "......oDDBBBBBBBBBBDDDDo...",
    "......oDBBBBBBBBBBBBDdo....",
    ".....oBBBBBBBBBBBBBBDo.....",
    ".....oBBBooBBBBooBBBBo.....",
    ".....cBBoeeoBBoeeoBBBm.....",
    ".....oBBBooBBBBooBBBBo.....",
    ".....oBBBBBBBnnBBBBBBo.....",
    ".....oBBBBBBBnnBBBBBBo.....",
    ".....oBBBBoooooooBBBBo.....",
    ".....oBBBBBPPPPPBBBBBo.....",
    "......oBBBBBBBBBBBBBo......",
    ".......obBBBBBBBBbo........",
    "........oJJJJJJJJo.........",
    ".......oJJJJJJJJJJo........",
    "......oJJJJggggJJJJo.......",
    "......oJJJJggggJJJJo.......",
    ".....oJJJJJJJJJJJJJJo......",
    ".....oJJJJJJJJJJJJJJo......",
    ".....oJJJJJJJJJJJJJJo......",
    "....PPPPoooooooooJJJJo.....",
    "...PppPPppPo.ooooooo.......",
    "...PPppPPppPo..............",
    "...PpPPppPPpo..............",
    "....PPPPPPPPo............."
]

build("hermeto", HERMETO)
build("graciliano", GRACILIANO)
build("marta", MARTA)
