"""
Big Bang Duel — Treinador de IA com Q-Learning
================================================
Sistema completo de treinamento por self-play (bot vs bot).
Treina agentes Q-Learning jogando entre si para descobrir estratégias ótimas.
Gera arquivos de estratégia para 3 níveis de dificuldade (easy/medium/hard).

Funcionalidades:
  - Q-Learning dual (dois agentes aprendem simultaneamente)
  - Inicialização aleatória de estados para cobertura completa
  - Decaimento adaptativo de epsilon e learning rate
  - Extração de estratégias com softmax para 3 dificuldades
  - Suite de validação completa (vs random, vs entre dificuldades)
  - Análise exhaustiva de payoff matrix
"""

import json
import os
import sys
import time
import random
import math
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple, Optional

import numpy as np

from game_engine import (
    GameState, get_available_cards, resolve_cards, build_payoff_matrix,
    CARDS_BY_MODE, LIFE_BY_MODE, MAX_AMMO, MAX_TURNS,
    CARD_RELOAD, CARD_SHOT, CARD_DODGE, CARD_DOUBLE_SHOT, CARD_COUNTER,
)
from game_engine import MAX_DODGE_STREAK, MAX_DOUBLE_SHOT_USES


# ═══════════════════════════════════════════════════════════════════════════
#  Q-LEARNING AGENT
# ═══════════════════════════════════════════════════════════════════════════

class QLearningAgent:
    """Agente Q-Learning tabular para Big Bang Duel."""

    def __init__(self, mode: str, alpha: float = 0.15, gamma: float = 0.95,
                 epsilon: float = 0.4):
        self.mode = mode
        self.alpha = alpha      # taxa de aprendizado
        self.gamma = gamma      # fator de desconto
        self.epsilon = epsilon  # taxa de exploração
        self.q_table: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        self.visit_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

    def get_action(self, state_key: str, available_cards: List[str],
                   training: bool = True) -> str:
        """Escolhe ação usando política epsilon-greedy."""
        if training and random.random() < self.epsilon:
            return random.choice(available_cards)

        # Exploitar: escolher melhor Q-value
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
        """Atualiza Q-value para um par estado-ação."""
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
    """
    Calcula a recompensa para o resultado de um turno.

    Incentivos:
      +100  vitória
      -100  derrota
      -5    empate (desincentivar empates)
      +5    por ponto de vida tirado do oponente
      -5    por ponto de vida perdido
      -0.3  por turno (incentivar vitórias rápidas)
    """
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

    # Dano causado / recebido
    reward += opp_life_lost * 5.0
    reward -= my_life_lost * 5.0

    # Penalidade por turno (vitórias rápidas)
    reward -= 0.3

    # Bônus de fim de jogo
    if result.get('game_over'):
        winner = result.get('winner')
        if winner == winner_key:
            reward += 100.0
        elif winner == loser_key:
            reward -= 100.0
        else:  # draw
            reward -= 5.0

    return reward


# ═══════════════════════════════════════════════════════════════════════════
#  TRAINER
# ═══════════════════════════════════════════════════════════════════════════

class Trainer:
    """Orquestrador de treinamento para um modo de jogo."""

    def __init__(self, mode: str, episodes: int = 2_000_000):
        self.mode = mode
        self.episodes = episodes
        self.agent_p = QLearningAgent(mode, alpha=0.15, gamma=0.95, epsilon=0.4)
        self.agent_o = QLearningAgent(mode, alpha=0.15, gamma=0.95, epsilon=0.4)

        # Estatísticas rolling
        self._stats = {'wins_p': 0, 'wins_o': 0, 'draws': 0,
                       'total_turns': 0, 'total_games': 0}

    def train(self) -> Dict:
        """Executa o loop de treinamento e retorna estratégias geradas."""
        start_time = time.time()
        mode_cards = CARDS_BY_MODE[self.mode]
        mode_life = LIFE_BY_MODE[self.mode]

        print(f"\n{'═' * 65}")
        print(f"  TREINAMENTO — Modo: {self.mode.upper()}")
        print(f"  Cartas: {mode_cards}")
        print(f"  Vida: {mode_life} | Munição máx: {MAX_AMMO}")
        print(f"  Episódios: {self.episodes:,}")
        print(f"{'═' * 65}")

        report_interval = max(1, self.episodes // 20)

        for episode in range(self.episodes):
            # 30% dos episódios começam de um estado aleatório
            # para garantir cobertura de estados raros
            if random.random() < 0.3:
                self._play_episode(random_start=True)
            else:
                self._play_episode(random_start=False)

            # Decaimento
            self.agent_p.decay_epsilon()
            self.agent_o.decay_epsilon()
            self.agent_p.decay_alpha()
            self.agent_o.decay_alpha()

            # Relatório de progresso
            if (episode + 1) % report_interval == 0:
                self._print_progress(episode + 1, start_time)
                self._stats = {k: 0 for k in self._stats}

        total_time = time.time() - start_time
        print(f"\n  Treinamento concluído em {total_time:.1f}s")

        # Gerar estratégias
        return self._generate_strategies()

    def _play_episode(self, random_start: bool = False):
        """Joga um episódio completo entre os dois agentes."""
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

        # Estatísticas
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
        """Cria um jogo com estado inicial aleatório para melhor cobertura."""
        game = GameState(self.mode)
        game.p_life = random.randint(1, game.max_life)
        game.o_life = random.randint(1, game.max_life)
        game.p_ammo = random.randint(0, MAX_AMMO)
        game.o_ammo = random.randint(0, MAX_AMMO)
        # Novos campos: dodge streak e double_shot remaining
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
        """Extrai estratégias das Q-tables treinadas."""
        print(f"\n  Gerando estratégias para {self.mode}...")

        # Mesclar Q-tables dos dois agentes (média)
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

                                    # HARD: temperatura baixa (quase ótimo)
                                    hard_probs = self._softmax_probs(q_vals, available, temperature=0.3)

                                    # MEDIUM: temperatura média (misto)
                                    medium_probs = self._softmax_probs(q_vals, available, temperature=1.5)

                                    # EASY: inverso (prefere jogadas ruins) + uniforme
                                    easy_probs = self._inverse_softmax_probs(q_vals, available, temperature=0.8)

                                    states_with_data += 1
                                else:
                                    # Sem dados de treino — distribuição uniforme
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
        print(f"  Q-table entries (P1): {sum(len(v) for v in self.agent_p.q_table.values())}")
        print(f"  Q-table entries (P2): {sum(len(v) for v in self.agent_o.q_table.values())}")

        return strategies

    @staticmethod
    def _softmax_probs(q_vals: Dict[str, float], available: List[str],
                       temperature: float) -> Dict[str, float]:
        """Converte Q-values em probabilidades via softmax."""
        values = np.array([q_vals.get(card, 0.0) for card in available], dtype=np.float64)

        if temperature <= 0.01:
            probs = np.zeros_like(values)
            probs[np.argmax(values)] = 1.0
        else:
            scaled = values / temperature
            scaled -= scaled.max()  # estabilidade numérica
            exp_vals = np.exp(scaled)
            probs = exp_vals / exp_vals.sum()

        result = {}
        for card, p in zip(available, probs):
            result[card] = round(float(p), 4)

        # Corrigir arredondamento
        total = sum(result.values())
        if total > 0 and abs(total - 1.0) > 0.0001:
            max_card = max(result, key=result.get)
            result[max_card] = round(result[max_card] + (1.0 - total), 4)

        return result

    @staticmethod
    def _inverse_softmax_probs(q_vals: Dict[str, float], available: List[str],
                                temperature: float) -> Dict[str, float]:
        """Softmax inverso — jogadas piores ficam mais prováveis (easy mode).
        Mistura com uniforme: 35% invertido + 65% uniforme."""
        values = np.array([q_vals.get(card, 0.0) for card in available], dtype=np.float64)

        # Negar Q-values para preferir ações piores
        values = -values
        scaled = values / temperature
        scaled -= scaled.max()
        exp_vals = np.exp(scaled)
        probs = exp_vals / exp_vals.sum()

        # Misturar com uniforme para não ser MUITO ruim
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
#  VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

def _choose_from_strategy(strategy: Dict, state_key: str,
                          available: List[str]) -> str:
    """Seleciona carta usando probabilidades da estratégia."""
    probs = strategy.get(state_key)
    if not probs:
        return random.choice(available)

    cards = [c for c in available if c in probs]
    weights = [probs[c] for c in cards]

    if not cards or sum(weights) <= 0:
        return random.choice(available)

    return random.choices(cards, weights=weights, k=1)[0]


def validate_strategies(strategies: Dict, mode: str,
                        num_games: int = 10000) -> Dict:
    """
    Valida estratégias rodando jogos de teste.
    Testa cada dificuldade contra random e entre si.
    """
    print(f"\n{'─' * 55}")
    print(f"  VALIDAÇÃO — {mode.upper()} ({num_games:,} jogos por teste)")
    print(f"{'─' * 55}")

    results = {}

    # === Cada dificuldade vs Random ===
    for difficulty in ['hard', 'medium', 'easy']:
        wins = losses = draws = total_turns = 0

        for _ in range(num_games):
            game = GameState(mode)
            while not game.is_game_over():
                # Bot com estratégia (player)
                state_key = game.get_state_key('player')
                avail_p = game.get_available_cards('player')
                action_p = _choose_from_strategy(strategies[difficulty],
                                                  state_key, avail_p)

                # Oponente aleatório
                avail_o = game.get_available_cards('opponent')
                action_o = random.choice(avail_o)

                game.apply_turn(action_p, action_o)

            winner = game.get_winner()
            if winner == 'player':
                wins += 1
            elif winner == 'opponent':
                losses += 1
            else:
                draws += 1
            total_turns += game.turn - 1

        wr = wins / num_games * 100
        lr = losses / num_games * 100
        dr = draws / num_games * 100
        avg_t = total_turns / num_games

        results[f'{difficulty}_vs_random'] = {
            'win_rate': round(wr, 2),
            'loss_rate': round(lr, 2),
            'draw_rate': round(dr, 2),
            'avg_game_length': round(avg_t, 2),
        }
        print(f"  {difficulty:>6} vs random: win={wr:.1f}%  loss={lr:.1f}%  "
              f"draw={dr:.1f}%  avg_turns={avg_t:.1f}")

    # === Dificuldades entre si ===
    matchups = [('hard', 'medium'), ('hard', 'easy'), ('medium', 'easy')]
    for diff_a, diff_b in matchups:
        wins_a = wins_b = draws_m = 0

        for _ in range(num_games):
            game = GameState(mode)
            while not game.is_game_over():
                state_p = game.get_state_key('player')
                avail_p = game.get_available_cards('player')
                action_p = _choose_from_strategy(strategies[diff_a],
                                                  state_p, avail_p)

                state_o = game.get_state_key('opponent')
                avail_o = game.get_available_cards('opponent')
                action_o = _choose_from_strategy(strategies[diff_b],
                                                  state_o, avail_o)

                game.apply_turn(action_p, action_o)

            winner = game.get_winner()
            if winner == 'player':
                wins_a += 1
            elif winner == 'opponent':
                wins_b += 1
            else:
                draws_m += 1

        wr_a = wins_a / num_games * 100
        wr_b = wins_b / num_games * 100
        dr_m = draws_m / num_games * 100

        results[f'{diff_a}_vs_{diff_b}'] = {
            f'{diff_a}_win_rate': round(wr_a, 2),
            f'{diff_b}_win_rate': round(wr_b, 2),
            'draw_rate': round(dr_m, 2),
        }
        print(f"  {diff_a:>6} vs {diff_b:<6}: "
              f"{diff_a}={wr_a:.1f}%  {diff_b}={wr_b:.1f}%  draw={dr_m:.1f}%")

    # === Análise de velocidade de vitória ===
    print(f"\n  Análise de velocidade de vitória (hard vs random):")
    turn_buckets = defaultdict(int)
    total_wins = 0
    for _ in range(num_games):
        game = GameState(mode)
        while not game.is_game_over():
            state_p = game.get_state_key('player')
            avail_p = game.get_available_cards('player')
            action_p = _choose_from_strategy(strategies['hard'], state_p, avail_p)
            avail_o = game.get_available_cards('opponent')
            action_o = random.choice(avail_o)
            game.apply_turn(action_p, action_o)

        if game.get_winner() == 'player':
            bucket = min((game.turn - 1) // 5 * 5, 30)  # 0-5, 5-10, ...
            turn_buckets[bucket] += 1
            total_wins += 1

    if total_wins > 0:
        for bucket in sorted(turn_buckets.keys()):
            count = turn_buckets[bucket]
            pct = count / total_wins * 100
            bar = '█' * int(pct / 2)
            print(f"    turnos {bucket:>2}-{bucket+5:<2}: {pct:5.1f}% {bar}")

    results['win_speed_distribution'] = {
        f"{k}-{k+5}": round(v / max(total_wins, 1) * 100, 2)
        for k, v in sorted(turn_buckets.items())
    }

    return results


# ═══════════════════════════════════════════════════════════════════════════
#  OUTPUT GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_output_file(mode: str, strategies: Dict, validation: Dict,
                          episodes: int, output_dir: str):
    """Gera o arquivo JSON de estratégia para um modo."""
    output = {
        'meta': {
            'mode': mode,
            'max_life': LIFE_BY_MODE[mode],
            'max_ammo': MAX_AMMO,
            'max_turns': MAX_TURNS,
            'cards': CARDS_BY_MODE[mode],
            'training_episodes': episodes,
            'training_date': datetime.now().isoformat(),
            'version': '1.0',
            'state_format': '{my_life}_{my_ammo}_{opp_life}_{last_opp_card}_{my_dodge_streak}_{my_double_shots_left}',
            'description': (
                'Arquivo de estratégia gerado por Q-Learning self-play. '
                'Cada dificuldade contém probabilidades de ação por estado. '
                'hard=ótimo, medium=balanceado, easy=subótimo.'
            ),
        },
        'validation': validation,
        'strategies': strategies,
    }

    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f'strategy_{mode}.json')

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    # Também gerar versão formatada para debug
    filepath_pretty = os.path.join(output_dir, f'strategy_{mode}_debug.json')
    with open(filepath_pretty, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    file_size = os.path.getsize(filepath)
    print(f"  Arquivo: {filepath} ({file_size / 1024:.1f} KB)")
    print(f"  Debug:   {filepath_pretty}")

    return filepath
