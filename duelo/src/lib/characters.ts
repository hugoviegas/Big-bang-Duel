/**
 * Central character registry for Big Bang Duel.
 * Every playable character is defined here — used by selection screens,
 * game arena, status bar, and future story/effect systems.
 */

export interface CharacterDef {
  id: string;
  name: string;
  title: string; // Display tagline shown under name
  description: string; // Short lore flavour text
  image: string; // Full-body sprite for arena / gallery
  /** CSS object-position to crop into the face area inside the circular avatar thumbnail.
   *  Format: "center X%" where X moves the viewport down the image.
   *  0% = top edge, 100% = bottom edge. ~10-20% shows the head for most sprites.
   *  Will be replaced by a dedicated profile-photo when available.
   */
  avatarCropY: string;
  rarity: "common" | "rare" | "legendary";
  // ── Placeholders for future features ─────────────────────────────────────
  story?: string; // In-universe biography (WIP)
  specialEffect?: string; // Name of the unique combat effect (WIP)
}

export const CHARACTERS: CharacterDef[] = [
  // ─── Original trio ───────────────────────────────────────────────────────
  {
    id: "marshal",
    name: "The Marshal",
    title: "O Xerife Destemido",
    description: "Guarda a lei com punho de ferro e pontaria certeira.",
    image: "/assets/characters/the_marshal.webp",
    avatarCropY: "10%",
    rarity: "rare",
  },
  {
    id: "skull",
    name: "The Skull",
    title: "O Fora-da-Lei",
    description: "Procurado em seis estados. Nunca foi pego.",
    image: "/assets/characters/the_skull.webp",
    avatarCropY: "10%",
    rarity: "rare",
  },
  {
    id: "la_dama",
    name: "La Dama",
    title: "A Pistoleira Lendária",
    description: "Elegante como uma rosa, mortal como seu revólver.",
    image: "/assets/characters/la_dama.webp",
    avatarCropY: "10%",
    rarity: "legendary",
  },

  // ─── New roster ──────────────────────────────────────────────────────────
  {
    id: "alucard",
    name: "Alucard",
    title: "O Senhor das Trevas",
    description: "Imortal por maldição, letal por vontade.",
    image: "/assets/characters/alucard_idle.webp",
    avatarCropY: "12%",
    rarity: "legendary",
  },
  {
    id: "detective_hopps",
    name: "Detective Hopps",
    title: "A Detetive Implacável",
    description: "Nenhum criminoso escapou dela. Nenhum.",
    image: "/assets/characters/detective_hopps_idle.webp",
    avatarCropY: "12%",
    rarity: "rare",
  },
  {
    id: "mokey_king",
    name: "Monkey King",
    title: "O Rei dos Macacos",
    description: "Ágil, malandro e impossível de acertar.",
    image: "/assets/characters/mokey_king_idle.webp",
    avatarCropY: "10%",
    rarity: "legendary",
  },
  {
    id: "pe_de_pano",
    name: "Pé de Pano",
    title: "O Fantasma do Sertão",
    description: "Ninguém ouve seus passos. Poucos veem sua saída.",
    image: "/assets/characters/pe_de_pano_idle.webp",
    avatarCropY: "10%",
    rarity: "common",
  },
  {
    id: "serpent_queen",
    name: "Serpent Queen",
    title: "A Rainha Serpente",
    description: "Seu veneno chega antes mesmo do duelo começar.",
    image: "/assets/characters/serpent_queen_idle.webp",
    avatarCropY: "12%",
    rarity: "legendary",
  },
  {
    id: "spider_noir",
    name: "Spider Noir",
    title: "O Vigilante das Sombras",
    description: "Tece suas armadilhas antes de chegar ao duelo.",
    image: "/assets/characters/spider_noir_idle.webp",
    avatarCropY: "12%",
    rarity: "rare",
  },
  {
    id: "stormtrooper",
    name: "Stormtrooper",
    title: "O Soldado do Império",
    description: "Armado até os dentes. A mira é outra história.",
    image: "/assets/characters/stormtrooper_idle.webp",
    avatarCropY: "10%",
    rarity: "common",
  },
  {
    id: "the_cowboy",
    name: "The Cowboy",
    title: "O Pistoleiro Clássico",
    description: "Direto do Velho Oeste, sem enfeite e sem piedade.",
    image: "/assets/characters/the_cowboy_idle.webp",
    avatarCropY: "10%",
    rarity: "common",
  },
  {
    id: "the_jedi",
    name: "The Jedi",
    title: "O Guardião da Força",
    description: "Seu sabre brilha antes do seu inimigo perceber.",
    image: "/assets/characters/the_jedi_idle.webp",
    avatarCropY: "10%",
    rarity: "legendary",
  },
  {
    id: "the_mandalorian",
    name: "The Mandalorian",
    title: "O Caçador de Recompensas",
    description: "Este é o caminho. E termina no duelo.",
    image: "/assets/characters/the_mandalorian_idle.webp",
    avatarCropY: "10%",
    rarity: "legendary",
  },
  {
    id: "the_outlaw",
    name: "The Outlaw",
    title: "O Fora-da-Lei Errante",
    description: "Nenhuma cidade o aceita; todas o temem.",
    image: "/assets/characters/the_outlaw_idle.webp",
    avatarCropY: "10%",
    rarity: "common",
  },
  {
    id: "the_rango",
    name: "The Rango",
    title: "O Xerife Acidental",
    description: "Um camaleão num mundo de cowboys. Improvisa bem.",
    image: "/assets/characters/the_rango_idle.webp",
    avatarCropY: "12%",
    rarity: "rare",
  },
  {
    id: "the_scrapper",
    name: "The Scrapper",
    title: "O Sucateiro Feroz",
    description: "Construído com peças de ferro-velho e ódio puro.",
    image: "/assets/characters/the_scrapper_idle.webp",
    avatarCropY: "10%",
    rarity: "rare",
  },
  {
    id: "the_sheriff",
    name: "The Sheriff",
    title: "O Guardião da Cidade",
    description: "Estrela no peito, bala na câmara, lei na ponta da língua.",
    image: "/assets/characters/the_sheriff_idle.webp",
    avatarCropY: "10%",
    rarity: "common",
  },
  {
    id: "the_witcher",
    name: "The Witcher",
    title: "O Bruxo Errante",
    description: "Monster slayer por profissão. Duelos, por prazer.",
    image: "/assets/characters/the_witcher_idle.webp",
    avatarCropY: "10%",
    rarity: "legendary",
  },
  {
    id: "tigress_blaze",
    name: "Tigress Blaze",
    title: "A Chama Selvagem",
    description: "Quem toca no fogo, queima. Simples assim.",
    image: "/assets/characters/tigress_blaze_idle.webp",
    avatarCropY: "12%",
    rarity: "rare",
  },
  {
    id: "the_razor",
    name: "The Razor",
    title: "O Navalha Silencioso",
    description:
      "Movimenta-se como sombra — a lâmina encontra o alvo antes do som.",
    image: "/assets/characters/the_razor_idle.webp",
    avatarCropY: "12%",
    rarity: "rare",
  },
];

/** Fast lookup by character ID. Falls back to the first character. */
export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** Returns the image path for a character id. */
export function getCharacterImage(id: string): string {
  return getCharacter(id).image;
}

/** CSS object-position string for avatar face crop. */
export function getAvatarCrop(id: string): string {
  return `center ${getCharacter(id).avatarCropY}`;
}

export const RARITY_STYLES: Record<CharacterDef["rarity"], string> = {
  common: "border-sand/40 text-sand",
  rare: "border-sky-500/60 text-sky-300",
  legendary: "border-gold/70 text-gold",
};

export const RARITY_LABELS: Record<CharacterDef["rarity"], string> = {
  common: "COMUM",
  rare: "RARO",
  legendary: "LENDÁRIO",
};
