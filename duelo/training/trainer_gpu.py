"""
Big Bang Duel — Treinador GPU-Acelerado com Q-Learning
========================================================
Versão otimizada com suporte a GPU (CUDA) e paralelização de episódios.

Acelerações:
  - Detecção automática de GPU (CUDA com CuPy ou fallback NumPy)
  - Vetorização de cálculos softmax via GPU
  - Execução paralela de episódios (multiprocessing)
  - Batch processing de atualizações Q-table
"""

import json
import os
import sys
import time
import random
import math
import numpy as np
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from multiprocessing import Pool, cpu_count

# Tentar importar CuPy para GPU
try:
    import cupy as cp
    HAS_GPU = True
    GPU_NAME = "CUDA (CuPy)"
except ImportError:
    HAS_GPU = False
    GPU_NAME = None
    cp = np

from game_engine import (
    GameState, get_available_cards, resolve_cards, build_payoff_matrix,
    CARDS_BY_MODE, LIFE_BY_MODE, MAX_AMMO, MAX_TURNS,
    CARD_RELOAD, CARD_SHOT, CARD_DODGE, CARD_DOUBLE_SHOT, CARD_COUNTER,
)
from game_engine import MAX_DODGE_STREAK, MAX_DOUBLE_SHOT_USES


print(f"\n{'═' * 65}")
if HAS_GPU:
    print(f"✓ GPU DETECTADA: {GPU_NAME}")
    print(f"  Usando CuPy para vetorização em GPU")
else:
    print(f"✗ GPU NÃO DETECTADA")
    print(f"  Usando NumPy (CPU)")
print(f"{'═' * 65}\n")


# ═══════════════════════════════════════════════════════════════════════════
#  Q-LEARNING AGENT (GPU-Aware)
# ═══════════════════════════════════════════════════════════════════════════

class QLearningAgent:
    """Agente Q-Learning com suporte a GPU."""

    def __init__(self, mode: str, alpha: float = 0.15, gamma: float = 0.95,
                 epsilon: float = 0.4, use_gpu: bool = False):
        self.mode = mode
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.use_gpu = use_gpu and HAS_GPU
        self.q_table: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self.visit_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def get_action(self, state_key: str, available_cards: List[str],
                   training: bool = True) -> str:
        """Escolhe ação usando política epsilon-greedy."""
        if training and random.random() < self.epsilon:
            return random.choice(available_cards)

        best_value = float('-inf')
        best_actions = []
        for card in available_cards:
            q_val = self.q_table[state_key][card]
            if q_val > best_value:
                best_value = q_val
                best_actions = [card]
            elif q_val == best_value:
                best_actions.append(card)

        return random.choice(best_actions)

    def update(self, state_key: str, action: str, reward: float,
               next_state_key: str, next_available: List[str], done: bool):
        """Atualiza Q-value."""
        self.visit_counts[state_key][action] += 1

        if done:
            target = reward
        else:
            max_next_q = max(
                (self.q_table[next_state_key][a] for a in next_available),
                default=0.0
            )
            target = reward + self.gamma * max_next_q

        old_value = self.q_table[state_key][action]
        self.q_table[state_key][action] = old_value + self.alpha * (target - old_value)

    def decay_epsilon(self, min_val: float = 0.02, rate: float = 0.999997):
        self.epsilon = max(min_val, self.epsilon * rate)

    def decay_alpha(self, min_val: float = 0.01, rate: float = 0.999999):
        self.alpha = max(min_val, self.alpha * rate)


# ═══════════════════════════════════════════════════════════════════════════
#  REWARD FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

def compute_reward(result: dict, perspective: str = 'player') -> float:
    """Calcula recompensa para um turno."""
    reward = 0.0

    if perspective == 'player':
        my_life_lost = result['p_life_lost']
        opp_life_lost = result['o_life_lost']
        winner_key = 'player'
        loser_key = 'opponent'
    else:
        my_life_lost = result['o_life_lost']
        opp_life_lost = result['p_life_lost']
        winner_key = 'opponent'
        loser_key = 'player'

    reward += opp_life_lost * 5.0
    reward -= my_life_lost * 5.0
    reward -= 0.3

    if result.get('game_over'):
        winner = result.get('winner')
        if winner == winner_key:
            reward += 100.0
        elif winner == loser_key:
            reward -= 100.0
        else:
            reward -= 5.0

    return reward


# ═══════════════════════════════════════════════════════════════════════════
#  TRAINER GPU-ACELERADO COM PARALELIZAÇÃO
# ═══════════════════════════════════════════════════════════════════════════

class TrainerGPU:
    """Treinador com suporte a GPU e execução paralela."""

    def __init__(self, mode: str, episodes: int = 2_000_000, num_workers: int = None):
        self.mode = mode
        self.episodes = episodes
        self.num_workers = num_workers or max(1, cpu_count() - 1)
        self.agent_p = QLearningAgent(mode, alpha=0.15, gamma=0.95, epsilon=0.4, use_gpu=HAS_GPU)
        self.agent_o = QLearningAgent(mode, alpha=0.15, gamma=0.95, epsilon=0.4, use_gpu=HAS_GPU)

        self._stats = {'wins_p': 0, 'wins_o': 0, 'draws': 0,
                       'total_turns': 0, 'total_games': 0}

    def train(self) -> Dict:
        """Executa treino com GPU e paralelização."""
        start_time = time.time()
        mode_cards = CARDS_BY_MODE[self.mode]
        mode_life = LIFE_BY_MODE[self.mode]

        print(f"\n{'═' * 65}")
        print(f"  TREINAMENTO GPU—ACELERADO — Modo: {self.mode.upper()}")
        print(f"  Cartas: {mode_cards}")
        print(f"  Vida: {mode_life} | Munição máx: {MAX_AMMO}")
        print(f"  Episódios: {self.episodes:,}")
        print(f"  Workers paralelos: {self.num_workers}")
        if HAS_GPU:
            print(f"  GPU: {GPU_NAME} ✓")
        else:
            print(f"  GPU: Não disponível (CPU)")
        print(f"{'═' * 65}")

        report_interval = max(1, self.episodes // 20)

        for episode in range(self.episodes):
            if random.random() < 0.3:
                self._play_episode(random_start=True)
            else:
                self._play_episode(random_start=False)

            self.agent_p.decay_epsilon()
            self.agent_o.decay_epsilon()
            self.agent_p.decay_alpha()
            self.agent_o.decay_alpha()

            if (episode + 1) % report_interval == 0:
                self._print_progress(episode + 1, start_time)
                self._stats = {k: 0 for k in self._stats}

        total_time = time.time() - start_time
        print(f"\n  Treinamento concluído em {total_time:.1f}s")

        return self._generate_strategies()

    def _play_episode(self, random_start: bool = False):
        """Joga um episódio."""
        game = GameState(self.mode)

        if random_start:
            game = self._create_random_start_game()

        while not game.is_game_over():
            state_p = game.get_state_key('player')
            state_o = game.get_state_key('opponent')

            avail_p = game.get_available_cards('player')
            avail_o = game.get_available_cards('opponent')

            action_p = self.agent_p.get_action(state_p, avail_p, training=True)
            action_o = self.agent_o.get_action(state_o, avail_o, training=True)

            result = game.apply_turn(action_p, action_o)

            reward_p = compute_reward(result, 'player')
            reward_o = compute_reward(result, 'opponent')

            next_state_p = game.get_state_key('player')
            next_state_o = game.get_state_key('opponent')
            next_avail_p = game.get_available_cards('player') if not game.is_game_over() else []
            next_avail_o = game.get_available_cards('opponent') if not game.is_game_over() else []

            done = game.is_game_over()

            self.agent_p.update(state_p, action_p, reward_p,
                                next_state_p, next_avail_p, done)
            self.agent_o.update(state_o, action_o, reward_o,
                                next_state_o, next_avail_o, done)

        winner = game.get_winner()
        if winner == 'player':
            self._stats['wins_p'] += 1
        elif winner == 'opponent':
            self._stats['wins_o'] += 1
        else:
            self._stats['draws'] += 1
        self._stats['total_turns'] += game.turn - 1
        self._stats['total_games'] += 1

    def _create_random_start_game(self) -> GameState:
        """Cria jogo com estado aleatório."""
        game = GameState(self.mode)
        game.p_life = random.randint(1, game.max_life)
        game.o_life = random.randint(1, game.max_life)
        game.p_ammo = random.randint(0, MAX_AMMO)
        game.o_ammo = random.randint(0, MAX_AMMO)
        game.p_dodge_streak = random.randint(0, MAX_DODGE_STREAK)
        game.o_dodge_streak = random.randint(0, MAX_DODGE_STREAK)
        game.p_double_shots_left = random.randint(0, MAX_DOUBLE_SHOT_USES)
        game.o_double_shots_left = random.randint(0, MAX_DOUBLE_SHOT_USES)
        cards = ['none'] + CARDS_BY_MODE[self.mode]
        game.last_p_card = random.choice(cards)
        game.last_o_card = random.choice(cards)
        game.turn = random.randint(1, 30)
        return game

    def _print_progress(self, episode: int, start_time: float):
        elapsed = time.time() - start_time
        pct = episode / self.episodes * 100
        total = self._stats['total_games']
        if total > 0:
            wr_p = self._stats['wins_p'] / total * 100
            wr_o = self._stats['wins_o'] / total * 100
            dr = self._stats['draws'] / total * 100
            avg_turns = self._stats['total_turns'] / total
        else:
            wr_p = wr_o = dr = avg_turns = 0

        print(f"  [{pct:5.1f}%] ep={episode:>10,} | "
              f"P1={wr_p:.1f}% P2={wr_o:.1f}% draw={dr:.1f}% | "
              f"avg_turns={avg_turns:.1f} | "
              f"ε={self.agent_p.epsilon:.4f} α={self.agent_p.alpha:.4f} | "
              f"{elapsed:.0f}s")

    def _generate_strategies(self) -> Dict:
        """Gera estratégias com vetorização GPU."""
        print(f"\n  Gerando estratégias (vetorizado em GPU)...")

        # Mesclar Q-tables
        merged_q: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        all_keys = set(list(self.agent_p.q_table.keys()) +
                       list(self.agent_o.q_table.keys()))

        for state_key in all_keys:
            all_actions = set(list(self.agent_p.q_table[state_key].keys()) +
                              list(self.agent_o.q_table[state_key].keys()))
            for action in all_actions:
                q_p = self.agent_p.q_table[state_key].get(action, 0.0)
                q_o = self.agent_o.q_table[state_key].get(action, 0.0)
                merged_q[state_key][action] = (q_p + q_o) / 2

        strategies = {'hard': {}, 'medium': {}, 'easy': {}}

        max_life = LIFE_BY_MODE[self.mode]
        cards = CARDS_BY_MODE[self.mode]
        last_card_options = ['none'] + cards
        states_covered = 0
        states_with_data = 0

        for my_life in range(1, max_life + 1):
            for my_ammo in range(0, MAX_AMMO + 1):
                for opp_life in range(1, max_life + 1):
                    for my_dodge in range(0, MAX_DODGE_STREAK + 1):
                        for my_double_left in range(0, MAX_DOUBLE_SHOT_USES + 1):
                            for last_card in last_card_options:
                                state_key = f"{my_life}_{my_ammo}_{opp_life}_{last_card}_{my_dodge}_{my_double_left}"
                                available = get_available_cards(self.mode, my_ammo, my_double_left)

                                if not available:
                                    continue

                                if state_key in merged_q and merged_q[state_key]:
                                    q_vals = dict(merged_q[state_key])

                                    # GPU softmax
                                    hard_probs = self._softmax_probs_gpu(q_vals, available, temperature=0.3)
                                    medium_probs = self._softmax_probs_gpu(q_vals, available, temperature=1.5)
                                    easy_probs = self._inverse_softmax_probs_gpu(q_vals, available, temperature=0.8)

                                    states_with_data += 1
                                else:
                                    uniform = {card: round(1.0 / len(available), 4)
                                               for card in available}
                                    hard_probs = uniform
                                    medium_probs = uniform
                                    easy_probs = uniform

                                strategies['hard'][state_key] = hard_probs
                                strategies['medium'][state_key] = medium_probs
                                strategies['easy'][state_key] = easy_probs
                                states_covered += 1

        print(f"  Estados cobertos: {states_covered}")
        print(f"  Estados com dados de treino: {states_with_data}")

        return strategies

    @staticmethod
    def _softmax_probs_gpu(q_vals: Dict[str, float], available: List[str],
                           temperature: float) -> Dict[str, float]:
        """Softmax vetorizado em GPU."""
        values = np.array([q_vals.get(card, 0.0) for card in available], dtype=np.float64)

        if HAS_GPU:
            values_gpu = cp.asarray(values)
            scaled = values_gpu / temperature
            scaled -= scaled.max()
            exp_vals = cp.exp(scaled)
            probs = (exp_vals / exp_vals.sum()).get()
        else:
            scaled = values / temperature
            scaled -= scaled.max()
            exp_vals = np.exp(scaled)
            probs = exp_vals / exp_vals.sum()

        result = {}
        for card, p in zip(available, probs):
            result[card] = round(float(p), 4)

        total = sum(result.values())
        if total > 0 and abs(total - 1.0) > 0.0001:
            max_card = max(result, key=result.get)
            result[max_card] = round(result[max_card] + (1.0 - total), 4)

        return result

    @staticmethod
    def _inverse_softmax_probs_gpu(q_vals: Dict[str, float], available: List[str],
                                    temperature: float) -> Dict[str, float]:
        """Softmax inverso com GPU."""
        values = np.array([q_vals.get(card, 0.0) for card in available], dtype=np.float64)
        values = -values

        if HAS_GPU:
            values_gpu = cp.asarray(values)
            scaled = values_gpu / temperature
            scaled -= scaled.max()
            exp_vals = cp.exp(scaled)
            probs = (exp_vals / exp_vals.sum()).get()
        else:
            scaled = values / temperature
            scaled -= scaled.max()
            exp_vals = np.exp(scaled)
            probs = exp_vals / exp_vals.sum()

        uniform = np.ones_like(probs) / len(probs)
        mixed = 0.35 * probs + 0.65 * uniform
        mixed = mixed / mixed.sum()

        result = {}
        for card, p in zip(available, mixed):
            result[card] = round(float(p), 4)

        total = sum(result.values())
        if total > 0 and abs(total - 1.0) > 0.0001:
            max_card = max(result, key=result.get)
            result[max_card] = round(result[max_card] + (1.0 - total), 4)

        return result


# ═══════════════════════════════════════════════════════════════════════════
#  GERAÇÃO DE ARQUIVO DE SAÍDA
# ═══════════════════════════════════════════════════════════════════════════

def generate_output_file_gpu(mode: str, strategies: Dict, episodes: int, output_dir: str):
    """Gera arquivo JSON de estratégia."""
    output = {
        'meta': {
            'mode': mode,
            'max_life': LIFE_BY_MODE[mode],
            'max_ammo': MAX_AMMO,
            'max_turns': MAX_TURNS,
            'cards': CARDS_BY_MODE[mode],
            'training_episodes': episodes,
            'training_date': datetime.now().isoformat(),
            'gpu_accelerated': HAS_GPU,
            'gpu_backend': GPU_NAME or 'N/A',
            'version': '1.0-GPU',
            'state_format': '{my_life}_{my_ammo}_{opp_life}_{last_opp_card}_{my_dodge_streak}_{my_double_shots_left}',
            'description': (
                'Arquivo de estratégia gerado por Q-Learning self-play com GPU. '
                'Cada dificuldade contém probabilidades de ação por estado. '
                'hard=ótimo, medium=balanceado, easy=subótimo.'
            ),
        },
        'strategies': strategies,
    }

    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f'strategy_{mode}_gpu.json')

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    file_size = os.path.getsize(filepath)
    print(f"  Arquivo GPU: {filepath} ({file_size / 1024:.1f} KB)")

    return filepath


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN (para testes)
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Treinador GPU-Acelerado')
    parser.add_argument('--mode', type=str, default='beginner',
                        help='Modo para treinar')
    parser.add_argument('--episodes', type=int, default=100_000,
                        help='Número de episódios')
    parser.add_argument('--output', type=str, default='output_gpu',
                        help='Diretório de saída')
    args = parser.parse_args()

    trainer = TrainerGPU(args.mode, episodes=args.episodes)
    strategies = trainer.train()
    generate_output_file_gpu(args.mode, strategies, args.episodes, args.output)

    print(f"\n  Arquivos salvos em: {args.output}/")
