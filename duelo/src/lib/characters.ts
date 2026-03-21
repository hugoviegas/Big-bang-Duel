/**
 * Central character registry for Big Bang Duel.
 * Every playable character is defined here — used by selection screens,
 * game arena, status bar, and future story/effect systems.
 */

import type { CharacterClass } from "../types";

export interface CharacterDef {
  id: string;
  name: string;
  title: string; // Display tagline shown under name
  description: string; // Short lore flavour text
  image: string; // Full-body sprite for arena / gallery
  /** Dedicated profile photo for circular avatar thumbnails. */
  profileImage: string;
  /** Additional profile photo variants (e.g. alternate poses). */
  profileImageAlts?: string[];
  /** CSS object-position to crop into the face area inside the circular avatar thumbnail.
   *  Used as fallback when profileImage is not available.
   */
  avatarCropY: string;
  rarity: "common" | "rare" | "legendary";
  /** Passive ability class — determines which special mechanic this character uses. */
  characterClass: CharacterClass;
  // ── Placeholders for future features ─────────────────────────────────────
  story?: string; // In-universe biography (WIP)
  specialEffect?: string; // Name of the unique combat effect (WIP)
}

/**
 * Display info for each character class.
 * Used in UI (character select, profile, battle HUD).
 */
export const CLASS_INFO: Record<
  CharacterClass,
  {
    name: string;
    abilityName: string;
    description: string;
    iconWebp: string;
    iconPng: string;
    color: string;
  }
> = {
  atirador: {
    name: "Atirador",
    abilityName: "Tiro Crítico",
    description:
      "Ao usar Tiro, tem {chance} de dar um tiro crítico que tira 2 vidas. A chance escala com a maestria da classe.",
    iconWebp: "/assets/class_icons/atirador_icon.webp",
    iconPng: "/assets/class_icons/png/atirador_icon.png",
    color: "text-red-400",
  },
  estrategista: {
    name: "Estrategista",
    abilityName: "Recarga Dupla",
    description:
      "Ao usar Recarga, tem {chance} de ganhar +2 munições ao invés de +1. A chance escala com a maestria da classe.",
    iconWebp: "/assets/class_icons/estrategista_icon.webp",
    iconPng: "/assets/class_icons/png/estrategista_icon.png",
    color: "text-blue-400",
  },
  sorrateiro: {
    name: "Sorrateiro",
    abilityName: "Esquiva Fantasma",
    description:
      "Ao usar qualquer carta, tem {chance} de esquivar automaticamente de tiros inimigos. A chance escala com a maestria da classe.",
    iconWebp: "/assets/class_icons/sorrateiro_icon.webp",
    iconPng: "/assets/class_icons/png/sorrateiro_icon.png",
    color: "text-purple-400",
  },
  ricochete: {
    name: "Ricochete",
    abilityName: "Ricochete",
    description:
      "Ao usar Contra-golpe, tem {chance} de dobrar o dano de retorno (chance dobrada contra Tiro Duplo). Escala com a maestria da classe.",
    iconWebp: "/assets/class_icons/ricochete_icon.webp",
    iconPng: "/assets/class_icons/png/ricochete_icon.png",
    color: "text-yellow-400",
  },
  sanguinario: {
    name: "Sanguinário",
    abilityName: "Bala Fantasma",
    description:
      "Ao usar qualquer carta, tem {chance} de recarregar 1 carga de Tiro Duplo (máx 2x por partida). Nunca ultrapassa 3 cargas ao mesmo tempo.",
    iconWebp: "/assets/class_icons/sanguinario_icon.webp",
    iconPng: "/assets/class_icons/png/sanguinario_icon.png",
    color: "text-orange-400",
  },
  suporte: {
    name: "Curandeiro",
    abilityName: "Cura",
    description:
      "Ao usar qualquer carta, tem {chance} de recuperar 1 HP (máx 2x por partida). A cura não ultrapassa a vida máxima.",
    iconWebp: "/assets/class_icons/suporte_icon.webp",
    iconPng: "/assets/class_icons/png/suporte_icon.png",
    color: "text-green-400",
  },
};

export function getClassIconSources(characterClass: CharacterClass): {
  webp: string;
  png: string;
} {
  const classInfo = CLASS_INFO[characterClass];
  return {
    webp: classInfo.iconWebp,
    png: classInfo.iconPng,
  };
}

export const CHARACTERS: CharacterDef[] = [
  // ─── Original trio ───────────────────────────────────────────────────────
  {
    id: "marshal",
    name: "The Marshal",
    title: "O Xerife Destemido",
    description: "Guarda a lei com punho de ferro e pontaria certeira.",
    image: "/assets/characters/the_marshal.webp",
    profileImage: "/assets/characters_profile/the_marshal_profile.webp",
    avatarCropY: "10%",
    rarity: "rare",
    characterClass: "atirador",
  },
  {
    id: "skull",
    name: "The Skull",
    title: "O Fora-da-Lei",
    description: "Procurado em seis estados. Nunca foi pego.",
    image: "/assets/characters/the_skull.webp",
    profileImage: "/assets/characters_profile/the_skull_profile.webp",
    avatarCropY: "10%",
    rarity: "rare",
    characterClass: "sanguinario",
  },
  {
    id: "la_dama",
    name: "Lá Zorra",
    title: "A Pistoleira Lendária",
    description: "Elegante como uma rosa, mortal como seu revólver.",
    image: "/assets/characters/la_dama.webp",
    profileImage: "/assets/characters_profile/la_dama_profile.webp",
    avatarCropY: "10%",
    rarity: "legendary",
    characterClass: "sorrateiro",
  },

  // ─── New roster ──────────────────────────────────────────────────────────
  {
    id: "alucard",
    name: "Alucard",
    title: "O Senhor das Trevas",
    description: "Imortal por maldição, letal por vontade.",
    image: "/assets/characters/alucard_idle.webp",
    profileImage: "/assets/characters_profile/alucard_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "sanguinario",
  },
  {
    id: "detective_hopps",
    name: "Detective Hopps",
    title: "A Detetive Implacável",
    description: "Nenhum criminoso escapou dela. Nenhum.",
    image: "/assets/characters/detective_hopps_idle.webp",
    profileImage: "/assets/characters_profile/detective_hopps_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "estrategista",
  },
  {
    id: "mokey_king",
    name: "Monkey King",
    title: "O Rei dos Macacos",
    description: "Ágil, malandro e impossível de acertar.",
    image: "/assets/characters/mokey_king_idle.webp",
    profileImage: "/assets/characters_profile/mokey_king_profile.webp",
    avatarCropY: "10%",
    rarity: "legendary",
    characterClass: "sorrateiro",
  },
  {
    id: "pe_de_pano",
    name: "Pé de Pano",
    title: "O Fantasma do Sertão",
    description: "Ninguém ouve seus passos. Poucos veem sua saída.",
    image: "/assets/characters/pe_de_pano_idle.webp",
    profileImage: "/assets/characters_profile/pe_de_pano_profile.webp",
    avatarCropY: "10%",
    rarity: "common",
    characterClass: "suporte",
  },
  {
    id: "serpent_queen",
    name: "Serpent Queen",
    title: "A Rainha Serpente",
    description: "Seu veneno chega antes mesmo do duelo começar.",
    image: "/assets/characters/serpent_queen_idle.webp",
    profileImage: "/assets/characters_profile/serpent_queen_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "sorrateiro",
  },
  {
    id: "spider_noir",
    name: "Spider Noir",
    title: "O Vigilante das Sombras",
    description: "Tece suas armadilhas antes de chegar ao duelo.",
    image: "/assets/characters/spider_noir_idle.webp",
    profileImage: "/assets/characters_profile/spider_noir_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "sorrateiro",
  },
  {
    id: "stormtrooper",
    name: "Stormtrooper",
    title: "O Soldado do Império",
    description: "Armado até os dentes. A mira é outra história.",
    image: "/assets/characters/stormtrooper_idle.webp",
    profileImage: "/assets/characters_profile/stormtrooper_profile.webp",
    avatarCropY: "10%",
    rarity: "common",
    characterClass: "atirador",
  },
  {
    id: "the_cowboy",
    name: "The Cowboy",
    title: "O Pistoleiro Clássico",
    description: "Direto do Velho Oeste, sem enfeite e sem piedade.",
    image: "/assets/characters/the_cowboy_idle.webp",
    profileImage: "/assets/characters_profile/the_cowboy_profile.webp",
    avatarCropY: "10%",
    rarity: "common",
    characterClass: "suporte",
  },
  {
    id: "the_jedi",
    name: "The Jedi",
    title: "O Guardião da Força",
    description: "Seu sabre brilha antes do seu inimigo perceber.",
    image: "/assets/characters/the_jedi_idle.webp",
    profileImage: "/assets/characters_profile/the_jedi_profile.webp",
    avatarCropY: "10%",
    rarity: "legendary",
    characterClass: "ricochete",
  },
  {
    id: "the_mandalorian",
    name: "The Mandalorian",
    title: "O Caçador de Recompensas",
    description: "Este é o caminho. E termina no duelo.",
    image: "/assets/characters/the_mandalorian_idle.webp",
    profileImage: "/assets/characters_profile/the_mandalorian_profile.webp",
    avatarCropY: "10%",
    rarity: "legendary",
    characterClass: "suporte",
  },
  {
    id: "the_outlaw",
    name: "The Outlaw",
    title: "O Fora-da-Lei Errante",
    description: "Nenhuma cidade o aceita; todas o temem.",
    image: "/assets/characters/the_outlaw_idle.webp",
    profileImage: "/assets/characters_profile/the_outlaw_profile.webp",
    avatarCropY: "10%",
    rarity: "common",
    characterClass: "ricochete",
  },
  {
    id: "the_rango",
    name: "The Rango",
    title: "O Xerife Acidental",
    description: "Um camaleão num mundo de cowboys. Improvisa bem.",
    image: "/assets/characters/the_rango_idle.webp",
    profileImage: "/assets/characters_profile/the_rango_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "atirador",
  },
  {
    id: "the_scrapper",
    name: "The Scrapper",
    title: "O Sucateiro Feroz",
    description: "Construído com peças de ferro-velho e ódio puro.",
    image: "/assets/characters/the_scrapper_idle.webp",
    profileImage: "/assets/characters_profile/the_scrapper_profile.webp",
    avatarCropY: "10%",
    rarity: "rare",
    characterClass: "suporte",
  },
  {
    id: "the_sheriff",
    name: "The Sheriff",
    title: "O Guardião da Cidade",
    description: "Estrela no peito, bala na câmara, lei na ponta da língua.",
    image: "/assets/characters/the_sheriff_idle.webp",
    profileImage: "/assets/characters_profile/the_sheriff_profile.webp",
    avatarCropY: "10%",
    rarity: "common",
    characterClass: "atirador",
  },
  {
    id: "the_witcher",
    name: "The Witcher",
    title: "O Bruxo Errante",
    description: "Monster slayer por profissão. Duelos, por prazer.",
    image: "/assets/characters/the_witcher_idle.webp",
    profileImage: "/assets/characters_profile/the_witcher_profile.webp",
    avatarCropY: "10%",
    rarity: "legendary",
    characterClass: "estrategista",
  },
  {
    id: "tigress_blaze",
    name: "Tigress Blaze",
    title: "A Chama Selvagem",
    description: "Quem toca no fogo, queima. Simples assim.",
    image: "/assets/characters/tigress_blaze_idle.webp",
    profileImage: "/assets/characters_profile/tigress_blaze_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "ricochete",
  },
  {
    id: "the_razor",
    name: "The Razor",
    title: "O Navalha Silencioso",
    description:
      "Movimenta-se como sombra — a lâmina encontra o alvo antes do som.",
    image: "/assets/characters/the_razor_idle.webp",
    profileImage: "/assets/characters_profile/the_razor_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "estrategista",
  },
  {
    id: "ben",
    name: "Ben",
    title: "O Tecno-Lutador",
    description: "Genial e determinado. Seus gadgets sempre encontram o alvo.",
    image: "/assets/characters/ben.webp",
    profileImage: "/assets/characters_profile/Ben_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "sanguinario",
  },
  {
    id: "cooper",
    name: "O Ladrão",
    title: "O Detetive Metódico",
    description: "Tático e preciso. Cada tiro conta quando o tempo aperta.",
    image: "/assets/characters/cooper.webp",
    profileImage: "/assets/characters_profile/cooper_profile.webp",
    avatarCropY: "12%",
    rarity: "common",
    characterClass: "sorrateiro",
  },
  {
    id: "o_genio",
    name: "O Gênio",
    title: "O Inventor Brilhante",
    description:
      "Cria estratégias tão inteligentes quanto seus próprios gadgets.",
    image: "/assets/characters/genio.webp",
    profileImage: "/assets/characters_profile/o_genio_profile.webp",
    avatarCropY: "10%",
    rarity: "rare",
    characterClass: "estrategista",
  },
  {
    id: "o_galo",
    name: "O Galo",
    title: "O Mestre do Kung Fu",
    description: "Rápido como o vento. Seus ataques nunca erram o caminho.",
    image: "/assets/characters/o galo.webp",
    profileImage: "/assets/characters_profile/o_galo_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "ricochete",
  },
  {
    id: "the_toon",
    name: "The Toon",
    title: "O Cartunista Cômico",
    description: "Imprevisível e cartoon. Faz tudo parecer fácil no duelo.",
    image: "/assets/characters/the toon.webp",
    profileImage: "/assets/characters_profile/the_toon_profile.webp",
    avatarCropY: "12%",
    rarity: "common",
    characterClass: "estrategista",
  },
  {
    id: "la_belle",
    name: "La Belle",
    title: "A Pistoleira Francesa",
    description: "Elegante no estilo, letal na execução. Proteção é sua arte.",
    image: "/assets/characters/la belle.webp",
    profileImage: "/assets/characters_profile/la_belle_profile.webp",
    avatarCropY: "12%",
    rarity: "rare",
    characterClass: "suporte",
  },
  {
    id: "o_panda",
    name: "O Panda",
    title: "O Guerreiro Pacífico",
    description:
      "Força descomunal. Seu poder ricocheteando é praticamente invencível.",
    image: "/assets/characters/o panda.webp",
    profileImage: "/assets/characters_profile/o_panda_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "ricochete",
  },
  {
    id: "tai_lung",
    name: "Tai Lung",
    title: "O Senhor Vermelho da Perdição",
    description:
      "Nascido na periferia das montanhas da morte, Tai Lung é um guerreiro lendário cuja reputação precede seu nome. Durante décadas, ele treinou sob as sombras de mestres esquecidos, aprendendo técnicas antigas que poucos vivos ainda conhecem. Sua jornada pela vingança começou quando rejeitado por seus próprios mestres por ser considerado 'demasiado ambicioso' — uma fraqueza que ele passou todo este tempo transformando em força bruta e foco letal.\n\nCom seus punhos selados em ouro vermelho e olhos que ardem de determinação implacável, Tai Lung se tornou sinônimo de destruição ordenada. Ele não briga por honra ou glória efêmera — cada movimento é calculado, cada ataque é para deixar uma marca indelével no adversário. Os duelos contra Tai Lung são legendários não pela graça do combate, mas pela absoluta dominação técnica que ele exerce.\n\nSeu estilo de combate é hipnotizante: movimentos fluidos como água que se transformam em ataques precisos como lâminas. Diz-se que era capaz de derrotar dez homens antes deles perceberem que a batalha já havia começado. Agora, ele traz esse legado de devastação para a arena de duelos, onde cada tiro que esquiva, cada movimento que executa, é uma declaração de superioridade absoluta.",
    image: "/assets/characters/tai lung.webp",
    profileImage: "/assets/characters_profile/tai_lung_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "sanguinario",
  },
  {
    id: "norris",
    name: "Norris",
    title: "O Lendário Indomável",
    description:
      "Norris é uma lenda viva do combate — um guerreiro que transcendeu o tempo através de disciplina absoluta e dedicação inabalável. Sua reputação não é construída sobre bravatas ou arrogância, mas sobre fatos simples e indiscutíveis: seus inimigos nunca conseguem acertá-lo duas vezes. Aqueles que enfrentaram Norris falam sobre sua presença quase sobrenatural na arena, como se ele pudesse ler cada movimento com antecipação perfeita.\n\nSeu poder reside não em técnicas exóticas, mas na maestria completa do corpo e mente. Cada ação é calculada, cada respiração é deliberada. Quando Norris deseja atirar novamente com apenas uma munição em vez de duas, o universo simplesmente concorda com ele. Seus músculos foram forjados através de décadas de treinamento implacável, tornando-o capaz de coisas que outros guerreiros consideram impossíveis. A verdade é que para Norris, o impossível é apenas o improvável.\n\nEle chegou aos duelos de Big Bang não em busca de glória ou riqueza, mas porque tinha que ir. Aqueles que enfrentam Norris sentem algo que poucas vezes experimentam: a calma absoluta de alguém que já venceu a si mesmo. Sua força não apenas física, mas espiritual, faz dele um adversário praticamente imbatível. Nos duelos, ele não apenas ganha — ele redefine o que é possível.",
    image: "/assets/characters/norris.webp",
    profileImage: "/assets/characters_profile/norris_profile.webp",
    avatarCropY: "12%",
    rarity: "legendary",
    characterClass: "sanguinario",
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

/** Returns the profile image path for a character id. */
export function getProfileImage(id: string): string {
  return getCharacter(id).profileImage;
}

/**
 * Returns all available profile images for a character (main + alts).
 */
export function getAllProfileImages(id: string): string[] {
  const char = getCharacter(id);
  return [char.profileImage, ...(char.profileImageAlts ?? [])];
}

/**
 * Returns all profile image options across all characters.
 */
export function getAllAvatarOptions(): {
  image: string;
  characterId: string;
  characterName: string;
}[] {
  const options: {
    image: string;
    characterId: string;
    characterName: string;
  }[] = [];
  for (const char of CHARACTERS) {
    options.push({
      image: char.profileImage,
      characterId: char.id,
      characterName: char.name,
    });
    for (const alt of char.profileImageAlts ?? []) {
      options.push({
        image: alt,
        characterId: char.id,
        characterName: char.name,
      });
    }
  }
  return options;
}

/**
 * Resolves the avatar picture to display for a user.
 * Priority: custom avatarPicture > character's profileImage.
 */
export function resolveAvatarPicture(
  avatarId: string,
  avatarPicture?: string | null,
): string {
  if (avatarPicture) return avatarPicture;
  return getProfileImage(avatarId);
}

/** CSS object-position string for avatar face crop. */
export function getAvatarCrop(id: string): string {
  return `center ${getCharacter(id).avatarCropY}`;
}

/** Returns the CharacterClass for a given character id. */
export function getCharacterClass(id: string): CharacterClass {
  return getCharacter(id).characterClass;
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
