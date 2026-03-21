import type {
  CardType,
  GameMode,
  TurnResult,
  PlayerState,
  CharacterClass,
} from "../types";
import { getClassAbilityChance } from "./progression";

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

/** Base ability trigger chance fallback (when class/mastery is unknown). */
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
 * @param pShields - player's remaining capped passive uses this match
 * @param oShields - opponent's remaining capped passive uses this match
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
  pMasteryLevel: number = 1,
  oMasteryLevel: number = 1,
  pShields: number = 0,
  oShields: number = 0,
  pDoubleShotsLeft?: number,
  oDoubleShotsLeft?: number,
  pLifeCurrent?: number,
  oLifeCurrent?: number,
  pMaxLife?: number,
  oMaxLife?: number,
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
  // Chances scale by class mastery level (1-5).
  // ─────────────────────────────────────────────────────────────────────────

  let playerAbilityTriggered: string | undefined;
  let opponentAbilityTriggered: string | undefined;
  let playerShieldUsed = false;
  let opponentShieldUsed = false;
  let playerDoubleShotReloaded = false;
  let opponentDoubleShotReloaded = false;

  const playerChance = pClass
    ? getClassAbilityChance(pClass, pMasteryLevel)
    : BASE_ABILITY_CHANCE;
  const opponentChance = oClass
    ? getClassAbilityChance(oClass, oMasteryLevel)
    : BASE_ABILITY_CHANCE;

  // ── ATIRADOR: Tiro Crítico ───────────────────────────────────────────────
  // When playing shot, chance to fire a second bullet.
  // - If base shot already caused damage, add +1 damage.
  // - If target used dodge, second bullet still connects (same behavior as double_shot vs dodge).
  if (pClass === "atirador" && pCard === "shot") {
    if (Math.random() < playerChance) {
      if (oLifeLost > 0) {
        oLifeLost += 1;
      } else if (oCard === "dodge") {
        oLifeLost = 1;
      }
      playerAbilityTriggered = "Tiro Crítico";
      narrative += " TIRO CRÍTICO!";
    }
  }
  if (oClass === "atirador" && oCard === "shot") {
    if (Math.random() < opponentChance) {
      if (pLifeLost > 0) {
        pLifeLost += 1;
      } else if (pCard === "dodge") {
        pLifeLost = 1;
      }
      opponentAbilityTriggered = "Tiro Crítico";
      narrative += " TIRO CRÍTICO do oponente!";
    }
  }

  // ── ESTRATEGISTA: Recarga Dupla ──────────────────────────────────────────
  // When using reload and ammo was gained, chance to gain +1 extra ammo (capped at MAX_AMMO).
  if (
    pClass === "estrategista" &&
    pCard === "reload" &&
    actualPAmmoChange > 0
  ) {
    if (Math.random() < playerChance) {
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
    if (Math.random() < opponentChance) {
      if (oAmmo + actualOAmmoChange < MAX_AMMO) {
        actualOAmmoChange += 1;
      }
      opponentAbilityTriggered = "Recarga Dupla";
      narrative += " RECARGA DUPLA do oponente!";
    }
  }

  // ── SORRATEIRO: Esquiva Fantasma ─────────────────────────────────────────
  // When playing any card other than dodge, chance to dodge incoming shot damage.
  // Only triggers when the player would take damage from a shot or double_shot.
  if (
    pClass === "sorrateiro" &&
    pCard !== "dodge" &&
    pLifeLost > 0 &&
    (oCard === "shot" || oCard === "double_shot")
  ) {
    if (Math.random() < playerChance) {
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
    if (Math.random() < opponentChance) {
      oLifeLost = 0;
      opponentAbilityTriggered = "Esquiva Fantasma";
      narrative += " ESQUIVA FANTASMA do oponente!";
    }
  }

  // ── RICOCHETE: Ricochete ─────────────────────────────────────────────────
  // When using counter that hits (oLifeLost > 0):
  //   - vs shot:        base class chance
  //   - vs double_shot: double class chance
  if (pClass === "ricochete" && pCard === "counter" && oLifeLost > 0) {
    const ricChance = oCard === "double_shot" ? playerChance * 2 : playerChance;
    if (Math.random() < ricChance) {
      oLifeLost += 1;
      playerAbilityTriggered = "Ricochete";
      narrative += " RICOCHETE! Dano duplicado!";
    }
  }
  if (oClass === "ricochete" && oCard === "counter" && pLifeLost > 0) {
    const ricChance =
      pCard === "double_shot" ? opponentChance * 2 : opponentChance;
    if (Math.random() < ricChance) {
      pLifeLost += 1;
      opponentAbilityTriggered = "Ricochete";
      narrative += " RICOCHETE do oponente!";
    }
  }

  // ── SANGUINÁRIO: Bala Fantasma ───────────────────────────────────────────
  // On any card, chance to recover 1 double_shot stack.
  // Limited to 2 activations per match (reuses pShields/oShields cap)
  // and never exceeds 3 stacks at once.
  const safePDoubleShotsLeft = pDoubleShotsLeft ?? MAX_DOUBLE_SHOT_USES;
  const safeODoubleShotsLeft = oDoubleShotsLeft ?? MAX_DOUBLE_SHOT_USES;

  if (pClass === "sanguinario" && pShields > 0 && safePDoubleShotsLeft < 3) {
    if (Math.random() < playerChance) {
      playerShieldUsed = true;
      playerDoubleShotReloaded = true;
      playerAbilityTriggered = "Bala Fantasma";
      narrative += " BALA FANTASMA! Você recuperou 1 carga de Tiro Duplo!";
    }
  }
  if (oClass === "sanguinario" && oShields > 0 && safeODoubleShotsLeft < 3) {
    if (Math.random() < opponentChance) {
      opponentShieldUsed = true;
      opponentDoubleShotReloaded = true;
      opponentAbilityTriggered = "Bala Fantasma";
      narrative += " BALA FANTASMA do oponente! +1 carga de Tiro Duplo!";
    }
  }

  // ── SUPORTE (CURANDEIRO): Cura ───────────────────────────────────────────
  // On any card, chance to recover 1 HP, limited to pShields/oShields uses.
  // Healing never exceeds max life.
  const safePLifeCurrent = pLifeCurrent ?? 0;
  const safeOLifeCurrent = oLifeCurrent ?? 0;
  const safePMaxLife = pMaxLife ?? safePLifeCurrent;
  const safeOMaxLife = oMaxLife ?? safeOLifeCurrent;

  if (pClass === "suporte" && pShields > 0 && safePLifeCurrent < safePMaxLife) {
    if (Math.random() < playerChance) {
      // Negative life loss means net healing, clamped by state layer max life.
      pLifeLost -= 1;
      playerShieldUsed = true;
      playerAbilityTriggered = "Cura";
      narrative += " CURA ATIVADA! Você recuperou 1 HP!";
    }
  }
  if (oClass === "suporte" && oShields > 0 && safeOLifeCurrent < safeOMaxLife) {
    if (Math.random() < opponentChance) {
      oLifeLost -= 1;
      opponentShieldUsed = true;
      opponentAbilityTriggered = "Cura";
      narrative += " CURA do oponente ativada!";
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
    playerDoubleShotReloaded,
    opponentDoubleShotReloaded,
  };
}
