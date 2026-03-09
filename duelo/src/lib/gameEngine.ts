import type {
  CardType,
  GameMode,
  TurnResult,
  PlayerState,
  CharacterClass,
} from "../types";

export const CARDS_BY_MODE: Record<GameMode, CardType[]> = {
  beginner: ["reload", "shot", "dodge"],
  normal: ["reload", "shot", "dodge", "double_shot"],
  advanced: ["reload", "shot", "dodge", "counter", "double_shot"],
};

export const LIFE_BY_MODE: Record<GameMode, number> = {
  beginner: 3,
  normal: 4,
  advanced: 4,
};

export const MAX_AMMO = 3;
export const MAX_DODGE_STREAK = 3; // Maximum consecutive dodges before forced to pick another card
export const MAX_DOUBLE_SHOT_USES = 2;

/** Base ability trigger chance (20%). Testing phase. Scales with character level in the future. */
export const BASE_ABILITY_CHANCE = 0.2;

export function getAvailableCards(
  mode: GameMode,
  ammo: number,
  doubleShotsLeft: number = MAX_DOUBLE_SHOT_USES,
  dodgeStreak: number = 0,
): CardType[] {
  return CARDS_BY_MODE[mode].filter((card) => {
    if (card === "shot") return ammo >= 1;
    if (card === "double_shot") return ammo >= 2 && doubleShotsLeft > 0;
    if (card === "counter") return ammo >= 1;
    if (card === "dodge") return dodgeStreak < MAX_DODGE_STREAK; // block after 3 consecutive dodges
    return true; // reload always available
  });
}

export function checkWinner(
  player: PlayerState,
  opponent: PlayerState,
): string | null {
  if (player.life <= 0 && opponent.life <= 0) return "draw";
  if (player.life <= 0) return opponent.id;
  if (opponent.life <= 0) return player.id;
  return null;
}

/**
 * Resolves a single turn, applying standard card-vs-card rules and then
 * rolling each player's passive class ability.
 *
 * @param pClass   - player's character class (for ability rolls)
 * @param oClass   - opponent's character class (for ability rolls)
 * @param pShields - player's remaining Suporte shield uses this match
 * @param oShields - opponent's remaining Suporte shield uses this match
 */
export function resolveCards(
  pCard: CardType,
  oCard: CardType,
  pAmmo: number,
  oAmmo: number,
  _mode: GameMode,
  turn: number,
  pClass?: CharacterClass,
  oClass?: CharacterClass,
  pShields: number = 0,
  oShields: number = 0,
): TurnResult {
  let pLifeLost = 0;
  let oLifeLost = 0;
  let pAmmoChange = 0;
  let oAmmoChange = 0;
  let narrative = "";

  const cost = (card: CardType) =>
    card === "shot" || card === "counter"
      ? -1
      : card === "double_shot"
        ? -2
        : 0;

  // Default cost reduction
  pAmmoChange += cost(pCard);
  oAmmoChange += cost(oCard);

  // Resolution Matrix
  if (pCard === "shot" && oCard === "shot") {
    pLifeLost = 1;
    oLifeLost = 1;
    narrative = "Troca de Tiros! Ambos foram atingidos!";
  } else if (pCard === "shot" && oCard === "double_shot") {
    pLifeLost = 2;
    oLifeLost = 1;
    narrative = "Você atirou, mas o oponente revidou com tiro duplo!";
  } else if (pCard === "shot" && oCard === "dodge") {
    narrative = "Oponente desviou do seu tiro!";
  } else if (pCard === "shot" && oCard === "reload") {
    // NOVA REGRA: oponente toma dano MAS ainda ganha +1 ammo (recarga contabilizada)
    oLifeLost = 1;
    narrative =
      "Você atirou durante a recarga! Oponente atingido, mas ainda recarregou!";
  } else if (pCard === "shot" && oCard === "counter") {
    pLifeLost = 1;
    narrative = "CONTRA GOLPE! Oponente desviou e atirou de volta!";
  } else if (pCard === "double_shot" && oCard === "shot") {
    pLifeLost = 1;
    oLifeLost = 2;
    narrative = "Tiro duplo! Oponente mal teve tempo de revidar!";
  } else if (pCard === "double_shot" && oCard === "double_shot") {
    pLifeLost = 2;
    oLifeLost = 2;
    narrative = "Banho de Sangue! Ambos usaram tiro duplo!";
  } else if (pCard === "double_shot" && oCard === "dodge") {
    // NOVA REGRA: dodge não evita double_shot completamente — ainda perde 1 de vida
    oLifeLost = 1;
    narrative = "Incrível! Desviou de um tiro, mas o segundo te acertou!";
  } else if (pCard === "double_shot" && oCard === "reload") {
    // NOVA REGRA: oponente toma 2 de dano MAS ainda ganha +1 ammo (recarga contabilizada)
    oLifeLost = 2;
    narrative =
      "Tiro Duplo na recarga! Oponente destruído, mas ainda recarregou!";
  } else if (pCard === "double_shot" && oCard === "counter") {
    pLifeLost = 1;
    narrative = "Oponente defletiu e contra-atacou o Tiro Duplo!";
  } else if (pCard === "dodge" && oCard === "shot") {
    narrative = "Belo desvio! A bala passou raspando!";
  } else if (pCard === "dodge" && oCard === "double_shot") {
    // NOVA REGRA: dodge não evita double_shot completamente — ainda perde 1 de vida
    pLifeLost = 1;
    narrative = "Quase! Você desviou de um tiro, mas o segundo te acertou!";
  } else if (pCard === "dodge" && oCard === "dodge") {
    narrative = "Ambos pularam pro mesmo lado. Que estranho...";
  } else if (pCard === "dodge" && oCard === "reload") {
    oAmmoChange += 1;
    narrative = "Você desviou do vento, oponente recarregou!";
  } else if (pCard === "dodge" && oCard === "counter") {
    narrative = "Oponente preparou um contra-golpe contra... nada.";
  } else if (pCard === "reload" && oCard === "shot") {
    // NOVA REGRA: jogador toma dano MAS ainda ganha +1 ammo (recarga contabilizada)
    pLifeLost = 1;
    narrative = "Atingido na recarga! Mas você ainda conseguiu recarregar!";
  } else if (pCard === "reload" && oCard === "double_shot") {
    // NOVA REGRA: jogador toma 2 de dano MAS ainda ganha +1 ammo (recarga contabilizada)
    pLifeLost = 2;
    narrative = "Massacre! Tiro Duplo na recarga... mas você ainda recarregou!";
  } else if (pCard === "reload" && oCard === "dodge") {
    pAmmoChange += 1;
    narrative = "Você recarregou tranquilamente enquanto ele pulava.";
  } else if (pCard === "reload" && oCard === "reload") {
    pAmmoChange += 1;
    oAmmoChange += 1;
    narrative = "Momento de paz. Ambos recarregaram suas armas.";
  } else if (pCard === "reload" && oCard === "counter") {
    pAmmoChange += 1;
    narrative = "Recarga limpa. O contra-golpe do oponente foi inútil.";
  } else if (pCard === "counter" && oCard === "shot") {
    oLifeLost = 1;
    narrative = "CONTRA GOLPE! Você desviou e devolveu o tiro!";
  } else if (pCard === "counter" && oCard === "double_shot") {
    oLifeLost = 1;
    narrative = "Mestre! Vocẽ bloqueou o Tiro Duplo e contra-atacou!";
  } else if (pCard === "counter" && oCard === "dodge") {
    narrative = "Silêncio constrangedor. Você sacou mas ele rolou pra longe.";
  } else if (pCard === "counter" && oCard === "reload") {
    oAmmoChange += 1;
    narrative = "Você aguardou um tiro que não veio. Ele recarregou.";
  } else if (pCard === "counter" && oCard === "counter") {
    narrative =
      "Duelo mental. Ambos seguraram as armas esperando o outro atirar.";
  }

  // Reload cap: NOVA REGRA — reload SEMPRE concede +1 ammo, mesmo quando interrompido por tiro
  let actualPAmmoChange =
    pCard === "reload" ? (pAmmo < MAX_AMMO ? 1 : 0) : pAmmoChange;
  let actualOAmmoChange =
    oCard === "reload" ? (oAmmo < MAX_AMMO ? 1 : 0) : oAmmoChange;

  // ─────────────────────────────────────────────────────────────────────────
  // CLASS ABILITY ROLLS
  // All abilities have BASE_ABILITY_CHANCE (5%) unless noted otherwise.
  // ─────────────────────────────────────────────────────────────────────────

  let playerAbilityTriggered: string | undefined;
  let opponentAbilityTriggered: string | undefined;
  let playerShieldUsed = false;
  let opponentShieldUsed = false;

  const chance = BASE_ABILITY_CHANCE;

  // ── ATIRADOR: Tiro Crítico ───────────────────────────────────────────────
  // When playing shot and the opponent would take damage, 5% chance to double it.
  if (pClass === "atirador" && pCard === "shot" && oLifeLost > 0) {
    if (Math.random() < chance) {
      oLifeLost += 1;
      playerAbilityTriggered = "Tiro Crítico";
      narrative += " TIRO CRÍTICO!";
    }
  }
  if (oClass === "atirador" && oCard === "shot" && pLifeLost > 0) {
    if (Math.random() < chance) {
      pLifeLost += 1;
      opponentAbilityTriggered = "Tiro Crítico";
      narrative += " TIRO CRÍTICO do oponente!";
    }
  }

  // ── ESTRATEGISTA: Recarga Dupla ──────────────────────────────────────────
  // When using reload and ammo was gained, 5% chance to gain +1 extra ammo (capped at MAX_AMMO).
  if (
    pClass === "estrategista" &&
    pCard === "reload" &&
    actualPAmmoChange > 0
  ) {
    if (Math.random() < chance) {
      // Grant an extra ammo if not already at max after the first reload
      if (pAmmo + actualPAmmoChange < MAX_AMMO) {
        actualPAmmoChange += 1;
      }
      playerAbilityTriggered = "Recarga Dupla";
      narrative += " RECARGA DUPLA!";
    }
  }
  if (
    oClass === "estrategista" &&
    oCard === "reload" &&
    actualOAmmoChange > 0
  ) {
    if (Math.random() < chance) {
      if (oAmmo + actualOAmmoChange < MAX_AMMO) {
        actualOAmmoChange += 1;
      }
      opponentAbilityTriggered = "Recarga Dupla";
      narrative += " RECARGA DUPLA do oponente!";
    }
  }

  // ── SORRATEIRO: Esquiva Fantasma ─────────────────────────────────────────
  // When playing any card other than dodge, 5% chance to dodge incoming shot damage.
  // Only triggers when the player would take damage from a shot or double_shot.
  if (
    pClass === "sorrateiro" &&
    pCard !== "dodge" &&
    pLifeLost > 0 &&
    (oCard === "shot" || oCard === "double_shot")
  ) {
    if (Math.random() < chance) {
      pLifeLost = 0;
      playerAbilityTriggered = "Esquiva Fantasma";
      narrative += " ESQUIVA FANTASMA! Dano evitado!";
    }
  }
  if (
    oClass === "sorrateiro" &&
    oCard !== "dodge" &&
    oLifeLost > 0 &&
    (pCard === "shot" || pCard === "double_shot")
  ) {
    if (Math.random() < chance) {
      oLifeLost = 0;
      opponentAbilityTriggered = "Esquiva Fantasma";
      narrative += " ESQUIVA FANTASMA do oponente!";
    }
  }

  // ── RICOCHETE: Ricochete ─────────────────────────────────────────────────
  // When using counter that hits (oLifeLost > 0):
  //   - vs shot:        5% chance to double return damage
  //   - vs double_shot: 10% chance to double return damage
  if (pClass === "ricochete" && pCard === "counter" && oLifeLost > 0) {
    const ricChance = oCard === "double_shot" ? chance * 2 : chance;
    if (Math.random() < ricChance) {
      oLifeLost += 1;
      playerAbilityTriggered = "Ricochete";
      narrative += " RICOCHETE! Dano duplicado!";
    }
  }
  if (oClass === "ricochete" && oCard === "counter" && pLifeLost > 0) {
    const ricChance = pCard === "double_shot" ? chance * 2 : chance;
    if (Math.random() < ricChance) {
      pLifeLost += 1;
      opponentAbilityTriggered = "Ricochete";
      narrative += " RICOCHETE do oponente!";
    }
  }

  // ── SANGUINÁRIO: Bala Fantasma ───────────────────────────────────────────
  // When using double_shot, 5% chance to consume only 1 ammo instead of 2.
  // (base cost was already set to -2; adding +1 makes it effectively -1)
  if (pClass === "sanguinario" && pCard === "double_shot") {
    if (Math.random() < chance) {
      actualPAmmoChange += 1; // offsets one bullet of the -2 cost
      playerAbilityTriggered = "Bala Fantasma";
      narrative += " BALA FANTASMA! Apenas 1 munição consumida!";
    }
  }
  if (oClass === "sanguinario" && oCard === "double_shot") {
    if (Math.random() < chance) {
      actualOAmmoChange += 1;
      opponentAbilityTriggered = "Bala Fantasma";
      narrative += " BALA FANTASMA do oponente!";
    }
  }

  // ── SUPORTE: Escudo ──────────────────────────────────────────────────────
  // When taking damage from a shot or double_shot, 5% chance to block 1 HP.
  // Limited to pShields / oShields remaining uses this match.
  if (
    pClass === "suporte" &&
    pLifeLost > 0 &&
    pShields > 0 &&
    (oCard === "shot" || oCard === "double_shot")
  ) {
    if (Math.random() < chance) {
      pLifeLost = Math.max(0, pLifeLost - 1);
      playerShieldUsed = true;
      playerAbilityTriggered = "Escudo";
      narrative += " ESCUDO ATIVADO! Dano bloqueado!";
    }
  }
  if (
    oClass === "suporte" &&
    oLifeLost > 0 &&
    oShields > 0 &&
    (pCard === "shot" || pCard === "double_shot")
  ) {
    if (Math.random() < chance) {
      oLifeLost = Math.max(0, oLifeLost - 1);
      opponentShieldUsed = true;
      opponentAbilityTriggered = "Escudo";
      narrative += " ESCUDO do oponente ativado!";
    }
  }

  return {
    turn,
    playerCard: pCard,
    opponentCard: oCard,
    playerLifeLost: pLifeLost,
    opponentLifeLost: oLifeLost,
    playerAmmoChange: actualPAmmoChange,
    opponentAmmoChange: actualOAmmoChange,
    narrative,
    playerAbilityTriggered,
    opponentAbilityTriggered,
    playerShieldUsed,
    opponentShieldUsed,
  };
}
