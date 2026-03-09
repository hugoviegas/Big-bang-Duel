/**
 * Strategy Loader — Carrega e usa estratégias treinadas por Q-Learning.
 *
 * Os arquivos JSON são gerados pelo sistema de treinamento Python
 * (training/trainer_v2.py) e devem ser copiados para public/data/.
 *
 * Formato do state key v3.0 (7 partes):
 * "{myLife}_{myAmmo}_{oppLife}_{lastOppCard}_{prevOppCard}_{myDodgeStreak}_{myDoubleShotsLeft}"
 * Exemplo: "3_1_2_reload_shot_0_3"
 *
 * O campo prevOppCard (penúltima carta do oponente) permite que o bot
 * detecte e reaja a padrões de 2 turnos do jogador.
 */

import type { CardType, GameMode, BotDifficulty } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface StrategyMeta {
  mode: string;
  max_life: number;
  max_ammo: number;
  cards: string[];
  training_episodes: number;
  training_date: string;
  version: string;
}

/** Mapping: state_key → { card: probability } */
type DifficultyStrategy = Record<string, Record<string, number>>;

interface StrategyFile {
  meta: StrategyMeta;
  validation: Record<string, unknown>;
  strategies: {
    hard: DifficultyStrategy;
    medium: DifficultyStrategy;
    easy: DifficultyStrategy;
  };
}

// ─── State ─────────────────────────────────────────────────────────────────

const strategyCache: Partial<Record<GameMode, StrategyFile>> = {};
let loadingPromise: Promise<void> | null = null;

// ─── Difficulty Mapping ────────────────────────────────────────────────────
// BotDifficulty do jogo → chave na estratégia treinada
const DIFFICULTY_MAP: Record<BotDifficulty, keyof StrategyFile["strategies"]> =
  {
    easy: "easy",
    medium: "medium",
    hard: "hard",
  };

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Carrega as estratégias treinadas para todos os modos.
 * Deve ser chamado uma vez no startup da app.
 * Se os arquivos não existirem, o bot usa fallback (lógica antiga).
 */
export async function loadStrategies(): Promise<void> {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const modes: GameMode[] = ["beginner", "normal", "advanced"];

    for (const mode of modes) {
      try {
        const response = await fetch(`/data/strategy_${mode}.json`);
        if (response.ok) {
          strategyCache[mode] = await response.json();
          console.log(`[StrategyLoader] Loaded strategy for ${mode}`);
        }
      } catch {
        // Arquivo não encontrado — bot usará fallback
      }
    }

    const loaded = Object.keys(strategyCache).length;
    console.log(`[StrategyLoader] ${loaded}/3 strategy files loaded`);
  })();

  return loadingPromise;
}

/**
 * Verifica se as estratégias estão carregadas para um modo.
 */
export function hasStrategy(mode: GameMode): boolean {
  return !!strategyCache[mode];
}

/**
 * Gera o state key para lookup na tabela de estratégia.
 * Formato v3.0 — inclui prevOppCard (penúltima carta do oponente)
 * para detecção de padrões de 2 turnos.
 */
export function getStateKey(
  myLife: number,
  myAmmo: number,
  oppLife: number,
  lastOppCard: string | null,
  prevOppCard: string | null,
  myDodgeStreak: number,
  myDoubleShotsLeft: number,
): string {
  return `${myLife}_${myAmmo}_${oppLife}_${lastOppCard || "none"}_${prevOppCard || "none"}_${myDodgeStreak}_${myDoubleShotsLeft}`;
}

/**
 * Escolhe uma carta usando a estratégia treinada.
 * Retorna null se não houver estratégia disponível (fallback para lógica antiga).
 */
export function getSmartBotCard(
  mode: GameMode,
  difficulty: BotDifficulty,
  botLife: number,
  botAmmo: number,
  playerLife: number,
  botDodgeStreak: number,
  botDoubleShotsLeft: number,
  lastPlayerCard: string | null,
  prevPlayerCard: string | null,
  availableCards: CardType[],
): CardType | null {
  const strategy = strategyCache[mode];
  if (!strategy) return null;

  const diffKey = DIFFICULTY_MAP[difficulty];
  const stateKey = getStateKey(
    botLife,
    botAmmo,
    playerLife,
    lastPlayerCard,
    prevPlayerCard,
    botDodgeStreak,
    botDoubleShotsLeft,
  );
  const probs = strategy.strategies[diffKey]?.[stateKey];

  if (!probs) return null;

  // Seleção randômica ponderada
  const rand = Math.random();
  let cumulative = 0;

  for (const card of availableCards) {
    const prob = probs[card] || 0;
    cumulative += prob;
    if (rand <= cumulative) {
      return card;
    }
  }

  // Fallback: última carta disponível
  return availableCards[availableCards.length - 1];
}
