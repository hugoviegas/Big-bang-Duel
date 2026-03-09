/**
 * Strategy Loader — Carrega e usa estratégias treinadas por Q-Learning.
 *
 * Os arquivos JSON são gerados pelo sistema de treinamento Python
 * (training/trainer_v3.py) e devem ser copiados para public/data/.
 *
 * Formato do state key v4.0 (6 partes — history bucket):
 * "{myLife}_{myAmmo}_{oppLife}_{historyBucket}_{myDodgeStreak}_{myDoubleShotsLeft}"
 * Exemplo: "3_1_2_8_0_2"
 *
 * O historyBucket (0-15) compacta as últimas 5 jogadas do oponente em
 * um padrão categórico: 0-3=defensivo, 4-7=misto, 8-11=agressivo, 12-15=ultra.
 */

import type { CardType, GameMode } from "../types";

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

// ─── History Bucketing ──────────────────────────────────────────────────────
// Réplica EXATA da função compute_history_bucket() do trainer_v3.py.
// Transforma array de 5 códigos de carta em bucket 0-15.

const CARD_TO_CODE: Record<string, number> = {
  none: 0,
  reload: 1,
  shot: 2,
  dodge: 3,
  counter: 4,
  double_shot: 5,
};

/**
 * Converte as últimas 5 cartas do oponente (nomes) em um bucket 0-15.
 * Buckets: 0-3=defensivo, 4-7=misto, 8-11=agressivo, 12-15=ultra-agressivo.
 */
export function computeHistoryBucket(history: (string | null)[]): number {
  // Converter nomes para códigos numéricos e pad para 5 elementos
  const codes: number[] = [];
  for (let i = 0; i < 5; i++) {
    const card = i < history.length ? history[history.length - 5 + i] : null;
    codes.push(card ? (CARD_TO_CODE[card] ?? 0) : 0);
  }

  // Contadores básicos
  let reloadCount = 0;
  let shotCount = 0;
  let dodgeCount = 0;
  let counterCount = 0;
  let doubleCount = 0;

  for (const c of codes) {
    if (c === 1) reloadCount++;
    else if (c === 2) shotCount++;
    else if (c === 3) dodgeCount++;
    else if (c === 4) counterCount++;
    else if (c === 5) doubleCount++;
  }

  const aggressive = shotCount + doubleCount + counterCount;
  const defensive = dodgeCount + reloadCount;

  // Alternação (sequência não-repetitiva)
  let alternates = 0;
  for (let i = 0; i < 4; i++) {
    if (codes[i] !== codes[i + 1]) alternates++;
  }

  // Heurística idêntica ao Python
  if (aggressive >= 4) return 12 + Math.min(3, alternates);
  if (aggressive >= 3) return 8 + Math.min(3, alternates);
  if (aggressive >= 2) return 4 + Math.min(3, defensive);
  return Math.min(3, defensive);
}

/**
 * Gera o state key para lookup na tabela de estratégia.
 * Formato v4.0 — usa historyBucket (0-15) derivado das últimas 5 jogadas.
 */
export function getStateKey(
  myLife: number,
  myAmmo: number,
  oppLife: number,
  historyBucket: number,
  myDodgeStreak: number,
  myDoubleShotsLeft: number,
): string {
  return `${myLife}_${myAmmo}_${oppLife}_${historyBucket}_${myDodgeStreak}_${myDoubleShotsLeft}`;
}

/**
 * Retorna as probabilidades treinadas para o estado atual.
 * Sempre usa a política 'hard' (a mais otimizada do treinamento).
 * Retorna null se não houver estratégia carregada — botAI usa fallback.
 *
 * A seleção final da carta é feita em botAI.ts, onde a persona aplica
 * temperatura de Boltzmann e biases antes de amostrar.
 */
export function getSmartBotCard(
  mode: GameMode,
  botLife: number,
  botAmmo: number,
  playerLife: number,
  botDodgeStreak: number,
  botDoubleShotsLeft: number,
  playerHistory: (string | null)[],
  availableCards: CardType[],
): { bucket: number; probs: Record<string, number> } | null {
  const strategy = strategyCache[mode];
  if (!strategy) return null;

  const bucket = computeHistoryBucket(playerHistory);
  const stateKey = getStateKey(
    botLife,
    botAmmo,
    playerLife,
    bucket,
    botDodgeStreak,
    botDoubleShotsLeft,
  );
  const probs = strategy.strategies.hard?.[stateKey];

  if (!probs) return null;

  // Validate that at least one available card has a probability
  const hasProb = availableCards.some((c) => (probs[c] ?? 0) > 0);
  if (!hasProb) return null;

  return { bucket, probs };
}
