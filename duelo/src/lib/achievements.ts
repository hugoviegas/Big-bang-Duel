/**
 * Achievement catalog and evaluation engine.
 *
 * Each achievement has 5 progressive tiers. Rewards are claimed manually.
 * Progress is evaluated after every match via `evaluateAchievements()`.
 */

import type {
  AchievementProgress,
  MatchSummary,
  PlayerProfile,
  Currencies,
  CharacterStats,
} from "../types";

// ─── Reward helpers ──────────────────────────────────────────────────────────

export interface AchievementReward {
  gold: number;
  ruby: number;
}

export interface AchievementTier {
  threshold: number;
  reward: AchievementReward;
  label: string; // tier-specific name
  description: string; // human-readable objective
}

export type AchievementGroup =
  | "level"
  | "discovery"
  | "single_match"
  | "cumulative"
  | "career"
  | "online";

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  name: string; // generic name for the achievement line
  icon: string; // SVG path string (placeholder)
  tiers: AchievementTier[]; // always length 5
}

// ─── SVG icon placeholders ───────────────────────────────────────────────────

const ICONS = {
  level:
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  discovery:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  dodge:
    "M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z",
  perfection:
    "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z",
  reflex:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  counter:
    "M9 11.75c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm6 0c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86 2.36-1.05 4.23-2.98 5.21-5.37C11.07 8.33 14.05 10 17.42 10c.78 0 1.53-.09 2.25-.26.21.71.33 1.47.33 2.26 0 4.41-3.59 8-8 8z",
  wins: "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z",
  veteran:
    "M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z",
  shots:
    "M7 5h10v2h2V3c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v4h2V5zm8.41 11.59L20 12l-4.59-4.59L14 8.83 17.17 12 14 15.17l1.41 1.42zM10 15.17L6.83 12 10 8.83 8.59 7.41 4 12l4.59 4.59L10 15.17zM17 19H7v-2H5v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4h-2v2z",
  reload:
    "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  doubleShot:
    "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z",
  streak:
    "M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z",
  online:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  trophy:
    "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z",
  mastery:
    "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  survival:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  rivals:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
} as const;

// ─── Achievement Catalog ─────────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // 1. Level
  {
    id: "level",
    group: "level",
    name: "Conquista de Nível",
    icon: ICONS.level,
    tiers: [
      {
        threshold: 2,
        reward: { gold: 200, ruby: 0 },
        label: "O Recém Chegado",
        description: "Alcançar nível 2",
      },
      {
        threshold: 4,
        reward: { gold: 250, ruby: 0 },
        label: "Iniciando os Trabalhos",
        description: "Alcançar nível 4",
      },
      {
        threshold: 6,
        reward: { gold: 0, ruby: 1 },
        label: "Sem Voltar Atrás",
        description: "Alcançar nível 6",
      },
      {
        threshold: 8,
        reward: { gold: 350, ruby: 1 },
        label: "Casca Grossa",
        description: "Alcançar nível 8",
      },
      {
        threshold: 10,
        reward: { gold: 500, ruby: 2 },
        label: "Lenda em Construção",
        description: "Alcançar nível 10",
      },
    ],
  },
  // 2. Discovery (opponent characters faced)
  {
    id: "discovery",
    group: "discovery",
    name: "Descobrimento",
    icon: ICONS.discovery,
    tiers: [
      {
        threshold: 3,
        reward: { gold: 100, ruby: 0 },
        label: "Desconhecido",
        description: "Duelar contra 3 personagens diferentes",
      },
      {
        threshold: 6,
        reward: { gold: 130, ruby: 0 },
        label: "Explorador Local",
        description: "Duelar contra 6 personagens diferentes",
      },
      {
        threshold: 10,
        reward: { gold: 0, ruby: 1 },
        label: "Cartógrafo do Duelo",
        description: "Duelar contra 10 personagens diferentes",
      },
      {
        threshold: 14,
        reward: { gold: 200, ruby: 1 },
        label: "Enciclopédia Viva",
        description: "Duelar contra 14 personagens diferentes",
      },
      {
        threshold: 18,
        reward: { gold: 300, ruby: 2 },
        label: "Mestre dos Encontros",
        description: "Duelar contra 18 personagens diferentes",
      },
    ],
  },
  // 3. Single match: dodges
  {
    id: "single_dodges",
    group: "single_match",
    name: "Esquiva Relâmpago",
    icon: ICONS.dodge,
    tiers: [
      {
        threshold: 3,
        reward: { gold: 0, ruby: 1 },
        label: "Sorte de Principiante",
        description: "Desviar 3 tiros em uma partida",
      },
      {
        threshold: 4,
        reward: { gold: 120, ruby: 1 },
        label: "Pés Rápidos",
        description: "Desviar 4 tiros em uma partida",
      },
      {
        threshold: 5,
        reward: { gold: 0, ruby: 2 },
        label: "Quase Intocável",
        description: "Desviar 5 tiros em uma partida",
      },
      {
        threshold: 6,
        reward: { gold: 200, ruby: 2 },
        label: "Fantasma do Deserto",
        description: "Desviar 6 tiros em uma partida",
      },
      {
        threshold: 7,
        reward: { gold: 300, ruby: 3 },
        label: "Impossível de Acertar",
        description: "Desviar 7 tiros em uma partida",
      },
    ],
  },
  // 4. Single match: perfect win
  {
    id: "perfect_win",
    group: "single_match",
    name: "Vitória Perfeita",
    icon: ICONS.perfection,
    tiers: [
      {
        threshold: 1,
        reward: { gold: 0, ruby: 5 },
        label: "Sentido Aranha",
        description: "Vencer sem levar dano",
      },
      {
        threshold: 2,
        reward: { gold: 200, ruby: 2 },
        label: "Sem Arranhões II",
        description: "2 vitórias perfeitas",
      },
      {
        threshold: 3,
        reward: { gold: 250, ruby: 3 },
        label: "Sem Arranhões III",
        description: "3 vitórias perfeitas",
      },
      {
        threshold: 4,
        reward: { gold: 350, ruby: 4 },
        label: "Sem Arranhões IV",
        description: "4 vitórias perfeitas",
      },
      {
        threshold: 5,
        reward: { gold: 500, ruby: 5 },
        label: "Sem Arranhões V",
        description: "5 vitórias perfeitas",
      },
    ],
  },
  // 5. Cumulative: total successful dodges
  {
    id: "total_dodges",
    group: "cumulative",
    name: "Reflexo Treinado",
    icon: ICONS.reflex,
    tiers: [
      {
        threshold: 5,
        reward: { gold: 100, ruby: 0 },
        label: "Reflexo Treinado I",
        description: "5 desvios bem-sucedidos",
      },
      {
        threshold: 10,
        reward: { gold: 130, ruby: 0 },
        label: "Reflexo Treinado II",
        description: "10 desvios bem-sucedidos",
      },
      {
        threshold: 15,
        reward: { gold: 0, ruby: 1 },
        label: "Reflexo Treinado III",
        description: "15 desvios bem-sucedidos",
      },
      {
        threshold: 22,
        reward: { gold: 220, ruby: 1 },
        label: "Reflexo Treinado IV",
        description: "22 desvios bem-sucedidos",
      },
      {
        threshold: 30,
        reward: { gold: 320, ruby: 2 },
        label: "Reflexo Treinado V",
        description: "30 desvios bem-sucedidos",
      },
    ],
  },
  // 6. Cumulative: total successful counters
  {
    id: "total_counters",
    group: "cumulative",
    name: "Mão Firme",
    icon: ICONS.counter,
    tiers: [
      {
        threshold: 5,
        reward: { gold: 100, ruby: 0 },
        label: "Mão Firme I",
        description: "5 contra-golpes com sucesso",
      },
      {
        threshold: 10,
        reward: { gold: 130, ruby: 0 },
        label: "Mão Firme II",
        description: "10 contra-golpes com sucesso",
      },
      {
        threshold: 15,
        reward: { gold: 0, ruby: 1 },
        label: "Mão Firme III",
        description: "15 contra-golpes com sucesso",
      },
      {
        threshold: 22,
        reward: { gold: 220, ruby: 1 },
        label: "Mão Firme IV",
        description: "22 contra-golpes com sucesso",
      },
      {
        threshold: 30,
        reward: { gold: 320, ruby: 2 },
        label: "Mão Firme V",
        description: "30 contra-golpes com sucesso",
      },
    ],
  },
  // 7. Total wins
  {
    id: "total_wins",
    group: "career",
    name: "Vitorioso",
    icon: ICONS.wins,
    tiers: [
      {
        threshold: 3,
        reward: { gold: 120, ruby: 0 },
        label: "Primeiros Passos",
        description: "3 vitórias",
      },
      {
        threshold: 8,
        reward: { gold: 150, ruby: 0 },
        label: "Embalado",
        description: "8 vitórias",
      },
      {
        threshold: 15,
        reward: { gold: 0, ruby: 1 },
        label: "Dominante",
        description: "15 vitórias",
      },
      {
        threshold: 25,
        reward: { gold: 240, ruby: 1 },
        label: "Colecionador de Vitórias",
        description: "25 vitórias",
      },
      {
        threshold: 40,
        reward: { gold: 350, ruby: 2 },
        label: "Rei da Poeira",
        description: "40 vitórias",
      },
    ],
  },
  // 8. Total matches
  {
    id: "total_matches",
    group: "career",
    name: "Veterano",
    icon: ICONS.veteran,
    tiers: [
      {
        threshold: 5,
        reward: { gold: 80, ruby: 0 },
        label: "Veterano I",
        description: "5 partidas",
      },
      {
        threshold: 12,
        reward: { gold: 120, ruby: 0 },
        label: "Veterano II",
        description: "12 partidas",
      },
      {
        threshold: 20,
        reward: { gold: 0, ruby: 1 },
        label: "Veterano III",
        description: "20 partidas",
      },
      {
        threshold: 35,
        reward: { gold: 200, ruby: 1 },
        label: "Veterano IV",
        description: "35 partidas",
      },
      {
        threshold: 50,
        reward: { gold: 300, ruby: 2 },
        label: "Veterano V",
        description: "50 partidas",
      },
    ],
  },
  // 9. Total shots fired
  {
    id: "total_shots",
    group: "cumulative",
    name: "Mãos Quentes",
    icon: ICONS.shots,
    tiers: [
      {
        threshold: 20,
        reward: { gold: 100, ruby: 0 },
        label: "Mãos Quentes I",
        description: "20 tiros disparados",
      },
      {
        threshold: 45,
        reward: { gold: 140, ruby: 0 },
        label: "Mãos Quentes II",
        description: "45 tiros disparados",
      },
      {
        threshold: 75,
        reward: { gold: 0, ruby: 1 },
        label: "Mãos Quentes III",
        description: "75 tiros disparados",
      },
      {
        threshold: 110,
        reward: { gold: 220, ruby: 1 },
        label: "Mãos Quentes IV",
        description: "110 tiros disparados",
      },
      {
        threshold: 150,
        reward: { gold: 320, ruby: 2 },
        label: "Mãos Quentes V",
        description: "150 tiros disparados",
      },
    ],
  },
  // 10. Total reloads
  {
    id: "total_reloads",
    group: "cumulative",
    name: "Cinto Cheio",
    icon: ICONS.reload,
    tiers: [
      {
        threshold: 15,
        reward: { gold: 90, ruby: 0 },
        label: "Cinto Cheio I",
        description: "15 recargas",
      },
      {
        threshold: 35,
        reward: { gold: 130, ruby: 0 },
        label: "Cinto Cheio II",
        description: "35 recargas",
      },
      {
        threshold: 60,
        reward: { gold: 0, ruby: 1 },
        label: "Cinto Cheio III",
        description: "60 recargas",
      },
      {
        threshold: 90,
        reward: { gold: 210, ruby: 1 },
        label: "Cinto Cheio IV",
        description: "90 recargas",
      },
      {
        threshold: 120,
        reward: { gold: 310, ruby: 2 },
        label: "Cinto Cheio V",
        description: "120 recargas",
      },
    ],
  },
  // 11. Double shots
  {
    id: "total_double_shots",
    group: "cumulative",
    name: "Dois Canos",
    icon: ICONS.doubleShot,
    tiers: [
      {
        threshold: 6,
        reward: { gold: 110, ruby: 0 },
        label: "Dois Canos I",
        description: "6 tiros duplos",
      },
      {
        threshold: 14,
        reward: { gold: 150, ruby: 0 },
        label: "Dois Canos II",
        description: "14 tiros duplos",
      },
      {
        threshold: 24,
        reward: { gold: 0, ruby: 1 },
        label: "Dois Canos III",
        description: "24 tiros duplos",
      },
      {
        threshold: 36,
        reward: { gold: 230, ruby: 1 },
        label: "Dois Canos IV",
        description: "36 tiros duplos",
      },
      {
        threshold: 50,
        reward: { gold: 330, ruby: 2 },
        label: "Dois Canos V",
        description: "50 tiros duplos",
      },
    ],
  },
  // 12. Win streak
  {
    id: "win_streak",
    group: "career",
    name: "Em Chamas",
    icon: ICONS.streak,
    tiers: [
      {
        threshold: 2,
        reward: { gold: 120, ruby: 0 },
        label: "Em Chamas I",
        description: "2 vitórias seguidas",
      },
      {
        threshold: 3,
        reward: { gold: 160, ruby: 0 },
        label: "Em Chamas II",
        description: "3 vitórias seguidas",
      },
      {
        threshold: 4,
        reward: { gold: 0, ruby: 1 },
        label: "Em Chamas III",
        description: "4 vitórias seguidas",
      },
      {
        threshold: 5,
        reward: { gold: 250, ruby: 1 },
        label: "Em Chamas IV",
        description: "5 vitórias seguidas",
      },
      {
        threshold: 6,
        reward: { gold: 350, ruby: 2 },
        label: "Em Chamas V",
        description: "6 vitórias seguidas",
      },
    ],
  },
  // 13. Online matches
  {
    id: "online_matches",
    group: "online",
    name: "Duelo Online",
    icon: ICONS.online,
    tiers: [
      {
        threshold: 3,
        reward: { gold: 120, ruby: 0 },
        label: "Conexão Inicial",
        description: "3 partidas online",
      },
      {
        threshold: 8,
        reward: { gold: 160, ruby: 0 },
        label: "Fila Ranqueada",
        description: "8 partidas online",
      },
      {
        threshold: 15,
        reward: { gold: 0, ruby: 1 },
        label: "Presença Digital",
        description: "15 partidas online",
      },
      {
        threshold: 25,
        reward: { gold: 250, ruby: 1 },
        label: "Regular da Arena",
        description: "25 partidas online",
      },
      {
        threshold: 40,
        reward: { gold: 350, ruby: 2 },
        label: "Ícone da Arena",
        description: "40 partidas online",
      },
    ],
  },
  // 14. Online trophies
  {
    id: "trophies",
    group: "online",
    name: "Troféus",
    icon: ICONS.trophy,
    tiers: [
      {
        threshold: 50,
        reward: { gold: 150, ruby: 0 },
        label: "Bronze Vivo",
        description: "Atingir 50 troféus",
      },
      {
        threshold: 100,
        reward: { gold: 200, ruby: 0 },
        label: "Prata Viva",
        description: "Atingir 100 troféus",
      },
      {
        threshold: 160,
        reward: { gold: 0, ruby: 2 },
        label: "Ouro Vivo",
        description: "Atingir 160 troféus",
      },
      {
        threshold: 230,
        reward: { gold: 300, ruby: 2 },
        label: "Platina Viva",
        description: "Atingir 230 troféus",
      },
      {
        threshold: 300,
        reward: { gold: 450, ruby: 3 },
        label: "Diamante Vivo",
        description: "Atingir 300 troféus",
      },
    ],
  },
  // 15. Character mastery (most played character)
  {
    id: "character_mastery",
    group: "career",
    name: "Maestria de Personagem",
    icon: ICONS.mastery,
    tiers: [
      {
        threshold: 5,
        reward: { gold: 120, ruby: 0 },
        label: "Sintonia I",
        description: "5 partidas com um personagem",
      },
      {
        threshold: 10,
        reward: { gold: 160, ruby: 0 },
        label: "Sintonia II",
        description: "10 partidas com um personagem",
      },
      {
        threshold: 16,
        reward: { gold: 0, ruby: 1 },
        label: "Sintonia III",
        description: "16 partidas com um personagem",
      },
      {
        threshold: 24,
        reward: { gold: 260, ruby: 1 },
        label: "Sintonia IV",
        description: "24 partidas com um personagem",
      },
      {
        threshold: 35,
        reward: { gold: 360, ruby: 2 },
        label: "Sintonia V",
        description: "35 partidas com um personagem",
      },
    ],
  },
  // 16. Survival (win with 2+ life remaining)
  {
    id: "high_life_wins",
    group: "career",
    name: "Sobrevivente",
    icon: ICONS.survival,
    tiers: [
      {
        threshold: 3,
        reward: { gold: 120, ruby: 0 },
        label: "Sobrevivente I",
        description: "Vencer com 2+ vida (3×)",
      },
      {
        threshold: 7,
        reward: { gold: 170, ruby: 0 },
        label: "Sobrevivente II",
        description: "Vencer com 2+ vida (7×)",
      },
      {
        threshold: 12,
        reward: { gold: 0, ruby: 1 },
        label: "Sobrevivente III",
        description: "Vencer com 2+ vida (12×)",
      },
      {
        threshold: 18,
        reward: { gold: 260, ruby: 1 },
        label: "Sobrevivente IV",
        description: "Vencer com 2+ vida (18×)",
      },
      {
        threshold: 25,
        reward: { gold: 360, ruby: 2 },
        label: "Sobrevivente V",
        description: "Vencer com 2+ vida (25×)",
      },
    ],
  },
  // 17. Unique online players defeated
  {
    id: "online_rivals",
    group: "online",
    name: "Rede Local",
    icon: ICONS.rivals,
    tiers: [
      {
        threshold: 2,
        reward: { gold: 120, ruby: 0 },
        label: "Rede Local I",
        description: "Vencer 2 jogadores diferentes",
      },
      {
        threshold: 4,
        reward: { gold: 160, ruby: 0 },
        label: "Rede Local II",
        description: "Vencer 4 jogadores diferentes",
      },
      {
        threshold: 7,
        reward: { gold: 0, ruby: 1 },
        label: "Rede Local III",
        description: "Vencer 7 jogadores diferentes",
      },
      {
        threshold: 10,
        reward: { gold: 260, ruby: 1 },
        label: "Rede Local IV",
        description: "Vencer 10 jogadores diferentes",
      },
      {
        threshold: 14,
        reward: { gold: 360, ruby: 2 },
        label: "Rede Local V",
        description: "Vencer 14 jogadores diferentes",
      },
    ],
  },
];

// ─── Helper maps ─────────────────────────────────────────────────────────────

const _achievementMap = new Map<string, AchievementDef>();
for (const a of ACHIEVEMENTS) _achievementMap.set(a.id, a);

export function getAchievementDef(id: string): AchievementDef | undefined {
  return _achievementMap.get(id);
}

// ─── Default progress ────────────────────────────────────────────────────────

export function defaultAchievementProgress(id: string): AchievementProgress {
  return { id, level: 0, progress: 0, claimedLevel: 0 };
}

export function normalizeAchievements(
  raw?: Record<string, AchievementProgress>,
): Record<string, AchievementProgress> {
  const result: Record<string, AchievementProgress> = {};
  for (const def of ACHIEVEMENTS) {
    result[def.id] = raw?.[def.id]
      ? { ...defaultAchievementProgress(def.id), ...raw[def.id] }
      : defaultAchievementProgress(def.id);
  }
  return result;
}

// ─── Metric extraction ──────────────────────────────────────────────────────

interface AchievementMetrics {
  level: number;
  opponentsFacedCount: number;
  singleMatchDodges: number;
  perfectWins: number;
  totalSuccessfulDodges: number;
  totalSuccessfulCounters: number;
  totalWins: number;
  totalMatches: number;
  totalShots: number;
  totalReloads: number;
  totalDoubleShots: number;
  winStreak: number;
  onlineMatches: number;
  trophies: number;
  maxCharacterMatches: number;
  highLifeWins: number;
  onlineRivalsCount: number;
}

/**
 * Extract achievement-relevant metrics from the profile AFTER a match update.
 * Note: `matchSummary` provides single-match data. Profile already has cumulative data.
 */
function extractMetrics(
  profile: PlayerProfile,
  match: MatchSummary,
): AchievementMetrics {
  return {
    level: profile.progression?.level ?? 1,
    opponentsFacedCount: (profile.opponentsFaced ?? []).length,
    singleMatchDodges: match.successfulDodges,
    perfectWins: profile.perfectWins ?? 0,
    totalSuccessfulDodges: sumCharacterField(profile.characterStats, "desvios"),
    totalSuccessfulCounters: sumCharacterField(
      profile.characterStats,
      "contraGolpes",
    ),
    totalWins: profile.statsByMode?.overall?.wins ?? profile.wins ?? 0,
    totalMatches:
      profile.statsByMode?.overall?.totalGames ?? profile.totalGames ?? 0,
    totalShots: sumCharacterField(profile.characterStats, "tirosDisparados"),
    totalReloads: sumCharacterField(profile.characterStats, "recargas"),
    totalDoubleShots: sumDoubleShots(profile.characterStats),
    winStreak: profile.winStreak ?? 0,
    onlineMatches: profile.statsByMode?.online?.totalGames ?? 0,
    trophies: profile.ranked?.trophies ?? 0,
    maxCharacterMatches: maxCharacterField(profile.characterStats, "partidas"),
    highLifeWins: profile.highLifeWins ?? 0,
    onlineRivalsCount: (profile.onlinePlayersDefeated ?? []).length,
  };
}

function sumCharacterField(
  stats: Record<string, CharacterStats> | undefined,
  field: keyof CharacterStats,
): number {
  if (!stats) return 0;
  return Object.values(stats).reduce((sum, s) => sum + (s[field] ?? 0), 0);
}

function sumDoubleShots(
  stats: Record<string, CharacterStats> | undefined,
): number {
  if (!stats) return 0;
  return Object.values(stats).reduce(
    (sum: number, s) => sum + (s.tirosDuplos ?? 0),
    0,
  );
}

function maxCharacterField(
  stats: Record<string, CharacterStats> | undefined,
  field: keyof CharacterStats,
): number {
  if (!stats) return 0;
  return Math.max(0, ...Object.values(stats).map((s) => s[field] ?? 0));
}

// ─── Core evaluation ─────────────────────────────────────────────────────────

export interface EvaluationResult {
  updatedProgress: Record<string, AchievementProgress>;
  newlyUnlocked: { achievementId: string; tierIndex: number; label: string }[];
}

/**
 * Evaluate all achievements after a match.
 * Returns the full progress map (to be persisted) and a list of newly unlocked tiers.
 */
export function evaluateAchievements(
  profile: PlayerProfile,
  match: MatchSummary,
): EvaluationResult {
  const currentProgress = normalizeAchievements(profile.achievements);
  const metrics = extractMetrics(profile, match);
  const newlyUnlocked: EvaluationResult["newlyUnlocked"] = [];

  for (const def of ACHIEVEMENTS) {
    const prog = { ...currentProgress[def.id] };
    const metricValue = getMetricForAchievement(def.id, metrics);

    // For single-match achievements progress is the peak single-match value
    // For cumulative/career achievements progress is the cumulative value
    if (def.group === "single_match") {
      prog.progress = Math.max(prog.progress, metricValue);
    } else {
      prog.progress = metricValue;
    }

    // Determine new level
    let newLevel = prog.level;
    for (let i = prog.level; i < def.tiers.length; i++) {
      if (prog.progress >= def.tiers[i].threshold) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    if (newLevel > prog.level) {
      // Unlock all tiers between old level+1 and newLevel
      for (let t = prog.level; t < newLevel; t++) {
        newlyUnlocked.push({
          achievementId: def.id,
          tierIndex: t,
          label: def.tiers[t].label,
        });
      }
      prog.level = newLevel;
      prog.unlockedAt = Date.now();
    }

    currentProgress[def.id] = prog;
  }

  return { updatedProgress: currentProgress, newlyUnlocked };
}

function getMetricForAchievement(id: string, m: AchievementMetrics): number {
  switch (id) {
    case "level":
      return m.level;
    case "discovery":
      return m.opponentsFacedCount;
    case "single_dodges":
      return m.singleMatchDodges;
    case "perfect_win":
      return m.perfectWins;
    case "total_dodges":
      return m.totalSuccessfulDodges;
    case "total_counters":
      return m.totalSuccessfulCounters;
    case "total_wins":
      return m.totalWins;
    case "total_matches":
      return m.totalMatches;
    case "total_shots":
      return m.totalShots;
    case "total_reloads":
      return m.totalReloads;
    case "total_double_shots":
      return m.totalDoubleShots;
    case "win_streak":
      return m.winStreak;
    case "online_matches":
      return m.onlineMatches;
    case "trophies":
      return m.trophies;
    case "character_mastery":
      return m.maxCharacterMatches;
    case "high_life_wins":
      return m.highLifeWins;
    case "online_rivals":
      return m.onlineRivalsCount;
    default:
      return 0;
  }
}

// ─── Claim reward (pure logic — Firestore transaction done in firebaseService) ─

export interface ClaimResult {
  ok: boolean;
  message: string;
  reward?: AchievementReward;
  updatedProgress?: AchievementProgress;
  updatedCurrencies?: Currencies;
}

/**
 * Pure logic for claiming an achievement tier reward.
 * Returns the updated progress and currencies if valid.
 */
export function computeClaimReward(
  achievementId: string,
  tierIndex: number,
  currentProgress: AchievementProgress,
  currentCurrencies: Currencies,
): ClaimResult {
  const def = getAchievementDef(achievementId);
  if (!def) return { ok: false, message: "Conquista não encontrada." };

  if (tierIndex < 0 || tierIndex >= def.tiers.length) {
    return { ok: false, message: "Nível inválido." };
  }

  const requiredLevel = tierIndex + 1;
  if (currentProgress.level < requiredLevel) {
    return { ok: false, message: "Conquista ainda não desbloqueada." };
  }

  if (currentProgress.claimedLevel >= requiredLevel) {
    return { ok: false, message: "Recompensa já resgatada." };
  }

  // Claim all unclaimed tiers up to requiredLevel
  let totalGold = 0;
  let totalRuby = 0;
  for (let i = currentProgress.claimedLevel; i < requiredLevel; i++) {
    totalGold += def.tiers[i].reward.gold;
    totalRuby += def.tiers[i].reward.ruby;
  }

  const updatedProgress: AchievementProgress = {
    ...currentProgress,
    claimedLevel: requiredLevel,
  };

  const updatedCurrencies: Currencies = {
    gold: currentCurrencies.gold + totalGold,
    ruby: currentCurrencies.ruby + totalRuby,
  };

  return {
    ok: true,
    message: "Recompensa resgatada!",
    reward: { gold: totalGold, ruby: totalRuby },
    updatedProgress,
    updatedCurrencies,
  };
}

// ─── Retroactive Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate achievements retroactively based on current profile progress.
 * Useful when a user hasn't played yet but has old profile data.
 * Does NOT return newly unlocked list; use only for syncing to Firestore.
 */
export function retroactivelyEvaluateAchievements(
  profile: PlayerProfile,
): Record<string, AchievementProgress> {
  const currentProgress = normalizeAchievements(profile.achievements);
  const metrics: AchievementMetrics = {
    level: profile.progression?.level ?? 1,
    opponentsFacedCount: (profile.opponentsFaced ?? []).length,
    singleMatchDodges: 0, // No single-match data for retroactive eval
    perfectWins: profile.perfectWins ?? 0,
    totalSuccessfulDodges: sumCharacterField(profile.characterStats, "desvios"),
    totalSuccessfulCounters: sumCharacterField(
      profile.characterStats,
      "contraGolpes",
    ),
    totalWins: profile.statsByMode?.overall?.wins ?? profile.wins ?? 0,
    totalMatches:
      profile.statsByMode?.overall?.totalGames ?? profile.totalGames ?? 0,
    totalShots: sumCharacterField(profile.characterStats, "tirosDisparados"),
    totalReloads: sumCharacterField(profile.characterStats, "recargas"),
    totalDoubleShots: sumDoubleShots(profile.characterStats),
    winStreak: profile.winStreak ?? 0,
    onlineMatches: profile.statsByMode?.online?.totalGames ?? 0,
    trophies: profile.ranked?.trophies ?? 0,
    maxCharacterMatches: maxCharacterField(profile.characterStats, "partidas"),
    highLifeWins: profile.highLifeWins ?? 0,
    onlineRivalsCount: (profile.onlinePlayersDefeated ?? []).length,
  };

  // Evaluate each achievement
  for (const def of ACHIEVEMENTS) {
    const prog = { ...currentProgress[def.id] };
    const metricValue = getMetricForAchievement(def.id, metrics);

    // Update progress value
    if (def.group === "single_match") {
      prog.progress = Math.max(prog.progress, metricValue);
    } else {
      prog.progress = metricValue;
    }

    // Determine new level
    let newLevel = prog.level;
    for (let i = prog.level; i < def.tiers.length; i++) {
      if (prog.progress >= def.tiers[i].threshold) {
        newLevel = i + 1;
      } else {
        break;
      }
    }

    if (newLevel > prog.level) {
      prog.level = newLevel;
      prog.unlockedAt = Date.now();
    }

    currentProgress[def.id] = prog;
  }

  return currentProgress;
}
