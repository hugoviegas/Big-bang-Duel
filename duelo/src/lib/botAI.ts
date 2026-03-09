import type { PlayerState, CardType, GameMode, BotDifficulty } from "../types";
import { getAvailableCards, MAX_DOUBLE_SHOT_USES } from "./gameEngine";
import { getSmartBotCard, hasStrategy } from "./strategyLoader";

export function botChooseCard(
  botState: PlayerState,
  playerHistory: CardType[],
  mode: GameMode,
  difficulty: BotDifficulty,
  playerState?: PlayerState,
): CardType {
  const available = getAvailableCards(
    mode,
    botState.ammo,
    botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
    botState.dodgeStreak ?? 0,
  );

  // ─── Estratégia treinada (Q-Learning v2 — pattern-aware) ────────────
  // Usa os 2 últimos turnos do jogador para detectar padrões
  if (hasStrategy(mode) && playerState) {
    const lastPlayerCard =
      playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;
    const prevPlayerCard =
      playerHistory.length > 1 ? playerHistory[playerHistory.length - 2] : null;

    const smartCard = getSmartBotCard(
      mode,
      difficulty,
      botState.life,
      botState.ammo,
      playerState.life,
      botState.dodgeStreak ?? 0,
      botState.doubleShotsLeft ?? MAX_DOUBLE_SHOT_USES,
      lastPlayerCard,
      prevPlayerCard,
      available,
    );

    if (smartCard) return smartCard;
  }

  // ─── Fallback: lógica original ───────────────────────────────────────
  if (difficulty === "easy" || available.length === 1) {
    return available[Math.floor(Math.random() * available.length)];
  }

  const rand = Math.random() * 100;

  if (difficulty === "medium") {
    if (botState.ammo === 0) {
      if (rand < 80) return "reload";
      return "dodge";
    } else if (botState.ammo === 1) {
      if (rand < 40 && available.includes("shot")) return "shot";
      if (rand < 70) return "dodge";
      return "reload";
    } else if (botState.ammo === 2) {
      if (rand < 35 && available.includes("shot")) return "shot";
      if (rand < 60 && available.includes("double_shot")) return "double_shot";
      if (rand < 80) return "dodge";
      return "reload";
    } else {
      if (rand < 30 && available.includes("shot")) return "shot";
      if (rand < 70 && available.includes("double_shot")) return "double_shot";
      if (rand < 85) return "dodge";
      return "reload";
    }
  }

  // Hard Logic — fallback com leitura de padrão de 2 turnos
  const lastPlayerCard =
    playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;
  const prevPlayerCard =
    playerHistory.length > 1 ? playerHistory[playerHistory.length - 2] : null;

  // Padrão detectado: oponente repetindo dodge → atacar
  if (lastPlayerCard === "dodge" && prevPlayerCard === "dodge") {
    if (available.includes("double_shot")) return "double_shot";
    if (available.includes("shot")) return "shot";
  }

  // Padrão: oponente recarregando repetidamente → atirar
  if (lastPlayerCard === "reload" && prevPlayerCard === "reload") {
    if (available.includes("double_shot") && rand < 75) return "double_shot";
    if (available.includes("shot")) return "shot";
  }

  if (botState.ammo === 0) {
    if (lastPlayerCard === "reload" || lastPlayerCard === "counter") {
      return "reload";
    }
    return rand < 50 ? "reload" : "dodge";
  }

  if (lastPlayerCard === "shot" || lastPlayerCard === "double_shot") {
    if (available.includes("counter") && rand < 60) return "counter";
    if (rand < 40) return "dodge";
    return available.includes("double_shot") ? "double_shot" : "shot";
  }

  if (lastPlayerCard === "counter" || lastPlayerCard === "dodge") {
    return "reload";
  }

  if (lastPlayerCard === "reload") {
    if (available.includes("double_shot") && rand < 70) return "double_shot";
    if (available.includes("shot")) return "shot";
    return "reload";
  }

  return available[Math.floor(Math.random() * available.length)];
}
