#!/usr/bin/env python3
"""
Big Bang Duel — Ultra Fast Trainer (CPU-first)
===============================================
Treinador otimizado para throughput alto em Python:
- Q-table em NumPy (sem dict/strings no loop principal)
- Estado codificado como inteiro
- Cartas disponiveis precomputadas por (ammo, double_shots_left)
- Resolve de turno com inteiros

Observacao: para este problema, reduzir overhead de Python costuma dar
mais ganho real do que mover apenas softmax para GPU.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import time
from multiprocessing import cpu_count, get_context
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

import numpy as np

from game_engine import (
    CARDS_BY_MODE,
    LIFE_BY_MODE,
    MAX_AMMO,
    MAX_TURNS,
    MAX_DODGE_STREAK,
    MAX_DOUBLE_SHOT_USES,
)
from trainer import validate_strategies

# Global action ids (fixed)
A_RELOAD = 0
A_SHOT = 1
A_DODGE = 2
A_COUNTER = 3
A_DOUBLE = 4

ACTION_NAMES = {
    A_RELOAD: 'reload',
    A_SHOT: 'shot',
    A_DODGE: 'dodge',
    A_COUNTER: 'counter',
    A_DOUBLE: 'double_shot',
}

NAME_TO_ACTION = {v: k for k, v in ACTION_NAMES.items()}


@dataclass
class ModeSpec:
    mode: str
    max_life: int
    mode_cards: List[str]
    mode_action_ids: List[int]
    last_card_names: List[str]
    last_name_to_code: Dict[str, int]
    card_to_last_code: Dict[int, int]
    state_count: int
    last_count: int


@dataclass
class EpisodeResult:
    winner: int  # 1=player, -1=opponent, 0=draw
    turns: int


class UltraFastTrainer:
    def __init__(
        self,
        mode: str,
        episodes: int,
        alpha: float = 0.15,
        gamma: float = 0.95,
        epsilon: float = 0.4,
        seed: int | None = None,
        verbose: bool = True,
    ):
        self.mode = mode
        self.episodes = episodes
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.verbose = verbose

        if seed is None:
            seed = int(time.time())
        self.rng = random.Random(seed)

        self.spec = self._build_mode_spec(mode)
        # Map real action id <-> q-table column index
        self.action_to_col = {a: i for i, a in enumerate(self.spec.mode_action_ids)}
        self.col_to_action = {i: a for i, a in enumerate(self.spec.mode_action_ids)}

        self._build_precomputed_actions()

        n_states = self.spec.state_count
        n_actions = len(self.spec.mode_action_ids)

        # Q tables (player and opponent learn simultaneously)
        self.q_p = np.zeros((n_states, n_actions), dtype=np.float32)
        self.q_o = np.zeros((n_states, n_actions), dtype=np.float32)
        self.vis_p = np.zeros((n_states, n_actions), dtype=np.int32)
        self.vis_o = np.zeros((n_states, n_actions), dtype=np.int32)

    def _build_mode_spec(self, mode: str) -> ModeSpec:
        max_life = LIFE_BY_MODE[mode]
        mode_cards = CARDS_BY_MODE[mode]
        mode_action_ids = [NAME_TO_ACTION[n] for n in mode_cards]
        last_card_names = ['none'] + mode_cards
        last_name_to_code = {n: i for i, n in enumerate(last_card_names)}

        card_to_last_code = {}
        for n in mode_cards:
            card_to_last_code[NAME_TO_ACTION[n]] = last_name_to_code[n]

        last_count = len(last_card_names)
        state_count = max_life * (MAX_AMMO + 1) * max_life * last_count * (MAX_DODGE_STREAK + 1) * (MAX_DOUBLE_SHOT_USES + 1)

        return ModeSpec(
            mode=mode,
            max_life=max_life,
            mode_cards=mode_cards,
            mode_action_ids=mode_action_ids,
            last_card_names=last_card_names,
            last_name_to_code=last_name_to_code,
            card_to_last_code=card_to_last_code,
            state_count=state_count,
            last_count=last_count,
        )

    def _build_precomputed_actions(self):
        # Cache available action ids for (ammo, double_left)
        self.available_actions: Dict[Tuple[int, int], List[int]] = {}
        for ammo in range(MAX_AMMO + 1):
            for dleft in range(MAX_DOUBLE_SHOT_USES + 1):
                out = []
                for a in self.spec.mode_action_ids:
                    if a == A_SHOT and ammo < 1:
                        continue
                    if a == A_COUNTER and ammo < 1:
                        continue
                    if a == A_DOUBLE and (ammo < 2 or dleft <= 0):
                        continue
                    out.append(a)
                self.available_actions[(ammo, dleft)] = out

        # Also cache q-table column indexes for faster max/select
        self.available_cols: Dict[Tuple[int, int], List[int]] = {}
        for key, acts in self.available_actions.items():
            self.available_cols[key] = [self.action_to_col[a] for a in acts]

    def _state_index(
        self,
        my_life: int,
        my_ammo: int,
        opp_life: int,
        last_opp_code: int,
        my_dodge_streak: int,
        my_double_left: int,
    ) -> int:
        # All inputs expected already clamped to valid ranges
        idx = my_life - 1
        idx = idx * (MAX_AMMO + 1) + my_ammo
        idx = idx * self.spec.max_life + (opp_life - 1)
        idx = idx * self.spec.last_count + last_opp_code
        idx = idx * (MAX_DODGE_STREAK + 1) + my_dodge_streak
        idx = idx * (MAX_DOUBLE_SHOT_USES + 1) + my_double_left
        return idx

    def _choose_action_col(self, q_row: np.ndarray, cols: List[int], epsilon: float) -> int:
        if self.rng.random() < epsilon:
            return cols[self.rng.randrange(len(cols))]

        # Argmax among valid cols with random tie-break
        best = -1e30
        best_cols = []
        for c in cols:
            v = float(q_row[c])
            if v > best:
                best = v
                best_cols = [c]
            elif v == best:
                best_cols.append(c)
        return best_cols[self.rng.randrange(len(best_cols))]

    def _resolve_turn(self, p_action: int, o_action: int, p_ammo: int, o_ammo: int):
        # Base ammo cost
        p_ammo_change = 0
        o_ammo_change = 0
        if p_action in (A_SHOT, A_COUNTER):
            p_ammo_change = -1
        elif p_action == A_DOUBLE:
            p_ammo_change = -2

        if o_action in (A_SHOT, A_COUNTER):
            o_ammo_change = -1
        elif o_action == A_DOUBLE:
            o_ammo_change = -2

        p_life_lost = 0
        o_life_lost = 0

        # Matrix logic (same semantics as game_engine.resolve_cards)
        if p_action == A_SHOT and o_action == A_SHOT:
            p_life_lost = 1; o_life_lost = 1
        elif p_action == A_SHOT and o_action == A_DOUBLE:
            p_life_lost = 2; o_life_lost = 1
        elif p_action == A_SHOT and o_action == A_DODGE:
            pass
        elif p_action == A_SHOT and o_action == A_RELOAD:
            o_life_lost = 1
        elif p_action == A_SHOT and o_action == A_COUNTER:
            p_life_lost = 1

        elif p_action == A_DOUBLE and o_action == A_SHOT:
            p_life_lost = 1; o_life_lost = 2
        elif p_action == A_DOUBLE and o_action == A_DOUBLE:
            p_life_lost = 2; o_life_lost = 2
        elif p_action == A_DOUBLE and o_action == A_DODGE:
            o_life_lost = 1
        elif p_action == A_DOUBLE and o_action == A_RELOAD:
            o_life_lost = 2
        elif p_action == A_DOUBLE and o_action == A_COUNTER:
            p_life_lost = 1

        elif p_action == A_DODGE and o_action == A_SHOT:
            pass
        elif p_action == A_DODGE and o_action == A_DOUBLE:
            p_life_lost = 1
        elif p_action == A_DODGE and o_action == A_DODGE:
            pass
        elif p_action == A_DODGE and o_action == A_RELOAD:
            pass
        elif p_action == A_DODGE and o_action == A_COUNTER:
            pass

        elif p_action == A_RELOAD and o_action == A_SHOT:
            p_life_lost = 1
        elif p_action == A_RELOAD and o_action == A_DOUBLE:
            p_life_lost = 2
        elif p_action == A_RELOAD and o_action == A_DODGE:
            pass
        elif p_action == A_RELOAD and o_action == A_RELOAD:
            pass
        elif p_action == A_RELOAD and o_action == A_COUNTER:
            pass

        elif p_action == A_COUNTER and o_action == A_SHOT:
            o_life_lost = 1
        elif p_action == A_COUNTER and o_action == A_DOUBLE:
            o_life_lost = 1
        elif p_action == A_COUNTER and o_action == A_DODGE:
            pass
        elif p_action == A_COUNTER and o_action == A_RELOAD:
            pass
        elif p_action == A_COUNTER and o_action == A_COUNTER:
            pass

        # Reload always gives +1 if not at max ammo
        if p_action == A_RELOAD:
            p_ammo_change = 1 if p_ammo < MAX_AMMO else 0
        if o_action == A_RELOAD:
            o_ammo_change = 1 if o_ammo < MAX_AMMO else 0

        return p_life_lost, o_life_lost, p_ammo_change, o_ammo_change

    def _winner(self, p_life: int, o_life: int, turn: int) -> int | None:
        # 1 player, -1 opponent, 0 draw, None ongoing
        if p_life <= 0 and o_life <= 0:
            return 0
        if p_life <= 0:
            return -1
        if o_life <= 0:
            return 1
        if turn > MAX_TURNS:
            if p_life > o_life:
                return 1
            if o_life > p_life:
                return -1
            # Russian roulette tiebreaker: alternating shots, 1/6 trigger
            r = 0
            while True:
                shooter = 1 if (r % 2 == 0) else -1
                if self.rng.random() < (1.0 / 6.0):
                    return shooter
                r += 1
        return None

    @staticmethod
    def _reward(p_life_lost: int, o_life_lost: int, winner: int | None, perspective: int) -> float:
        # perspective: 1 for player, -1 for opponent
        if perspective == 1:
            my_lost, opp_lost = p_life_lost, o_life_lost
            win_key, lose_key = 1, -1
        else:
            my_lost, opp_lost = o_life_lost, p_life_lost
            win_key, lose_key = -1, 1

        reward = 0.0
        reward += opp_lost * 5.0
        reward -= my_lost * 5.0
        reward -= 0.3

        if winner is not None:
            if winner == win_key:
                reward += 100.0
            elif winner == lose_key:
                reward -= 100.0
            else:
                reward -= 5.0

        return reward

    def _random_start_state(self):
        max_life = self.spec.max_life
        return {
            'p_life': self.rng.randint(1, max_life),
            'o_life': self.rng.randint(1, max_life),
            'p_ammo': self.rng.randint(0, MAX_AMMO),
            'o_ammo': self.rng.randint(0, MAX_AMMO),
            'p_dodge': self.rng.randint(0, MAX_DODGE_STREAK),
            'o_dodge': self.rng.randint(0, MAX_DODGE_STREAK),
            'p_double': self.rng.randint(0, MAX_DOUBLE_SHOT_USES),
            'o_double': self.rng.randint(0, MAX_DOUBLE_SHOT_USES),
            'last_p': self.rng.randrange(self.spec.last_count),
            'last_o': self.rng.randrange(self.spec.last_count),
            'turn': self.rng.randint(1, 30),
        }

    def _initial_state(self):
        ml = self.spec.max_life
        return {
            'p_life': ml,
            'o_life': ml,
            'p_ammo': 0,
            'o_ammo': 0,
            'p_dodge': 0,
            'o_dodge': 0,
            'p_double': MAX_DOUBLE_SHOT_USES,
            'o_double': MAX_DOUBLE_SHOT_USES,
            'last_p': 0,  # none
            'last_o': 0,  # none
            'turn': 1,
        }

    def _play_episode(self, epsilon: float, alpha: float) -> EpisodeResult:
        s = self._random_start_state() if self.rng.random() < 0.3 else self._initial_state()

        while True:
            p_cols = self.available_cols[(s['p_ammo'], s['p_double'])]
            o_cols = self.available_cols[(s['o_ammo'], s['o_double'])]

            p_state_idx = self._state_index(
                s['p_life'], s['p_ammo'], s['o_life'], s['last_o'], s['p_dodge'], s['p_double']
            )
            o_state_idx = self._state_index(
                s['o_life'], s['o_ammo'], s['p_life'], s['last_p'], s['o_dodge'], s['o_double']
            )

            p_col = self._choose_action_col(self.q_p[p_state_idx], p_cols, epsilon)
            o_col = self._choose_action_col(self.q_o[o_state_idx], o_cols, epsilon)

            p_action = self.col_to_action[p_col]
            o_action = self.col_to_action[o_col]

            p_life_lost, o_life_lost, p_ammo_ch, o_ammo_ch = self._resolve_turn(
                p_action, o_action, s['p_ammo'], s['o_ammo']
            )

            s['p_life'] = max(0, s['p_life'] - p_life_lost)
            s['o_life'] = max(0, s['o_life'] - o_life_lost)
            s['p_ammo'] = min(MAX_AMMO, max(0, s['p_ammo'] + p_ammo_ch))
            s['o_ammo'] = min(MAX_AMMO, max(0, s['o_ammo'] + o_ammo_ch))

            s['p_dodge'] = min(MAX_DODGE_STREAK, s['p_dodge'] + 1) if p_action == A_DODGE else 0
            s['o_dodge'] = min(MAX_DODGE_STREAK, s['o_dodge'] + 1) if o_action == A_DODGE else 0

            if p_action == A_DOUBLE:
                s['p_double'] = max(0, s['p_double'] - 1)
            if o_action == A_DOUBLE:
                s['o_double'] = max(0, s['o_double'] - 1)

            s['last_p'] = self.spec.card_to_last_code[p_action]
            s['last_o'] = self.spec.card_to_last_code[o_action]
            s['turn'] += 1

            winner = self._winner(s['p_life'], s['o_life'], s['turn'])
            done = winner is not None

            r_p = self._reward(p_life_lost, o_life_lost, winner, perspective=1)
            r_o = self._reward(p_life_lost, o_life_lost, winner, perspective=-1)

            self.vis_p[p_state_idx, p_col] += 1
            self.vis_o[o_state_idx, o_col] += 1

            old_p = self.q_p[p_state_idx, p_col]
            old_o = self.q_o[o_state_idx, o_col]

            if done:
                target_p = r_p
                target_o = r_o
            else:
                next_p_idx = self._state_index(
                    s['p_life'], s['p_ammo'], s['o_life'], s['last_o'], s['p_dodge'], s['p_double']
                )
                next_o_idx = self._state_index(
                    s['o_life'], s['o_ammo'], s['p_life'], s['last_p'], s['o_dodge'], s['o_double']
                )
                next_p_cols = self.available_cols[(s['p_ammo'], s['p_double'])]
                next_o_cols = self.available_cols[(s['o_ammo'], s['o_double'])]

                max_next_p = max(float(self.q_p[next_p_idx, c]) for c in next_p_cols)
                max_next_o = max(float(self.q_o[next_o_idx, c]) for c in next_o_cols)

                target_p = r_p + self.gamma * max_next_p
                target_o = r_o + self.gamma * max_next_o

            self.q_p[p_state_idx, p_col] = old_p + alpha * (target_p - old_p)
            self.q_o[o_state_idx, o_col] = old_o + alpha * (target_o - old_o)

            if done:
                if winner == 1:
                    return EpisodeResult(winner=1, turns=s['turn'] - 1)
                if winner == -1:
                    return EpisodeResult(winner=-1, turns=s['turn'] - 1)
                return EpisodeResult(winner=0, turns=s['turn'] - 1)

    def train(self):
        start = time.time()
        if self.verbose:
            print(f"\n{'=' * 70}")
            print(f"ULTRA FAST TRAINING | mode={self.mode} | episodes={self.episodes:,}")
            print(f"state_count={self.spec.state_count:,} | actions={self.spec.mode_cards}")
            print(f"{'=' * 70}")

        eps = self.epsilon
        alpha = self.alpha

        wins_p = wins_o = draws = total_turns = 0
        report_interval = max(1, self.episodes // 20)

        for ep in range(1, self.episodes + 1):
            out = self._play_episode(eps, alpha)
            if out.winner == 1:
                wins_p += 1
            elif out.winner == -1:
                wins_o += 1
            else:
                draws += 1
            total_turns += out.turns

            # decays
            eps = max(0.02, eps * 0.999997)
            alpha = max(0.01, alpha * 0.999999)

            if self.verbose and ep % report_interval == 0:
                games = report_interval
                wrp = wins_p / games * 100
                wro = wins_o / games * 100
                dr = draws / games * 100
                avg_t = total_turns / games
                elapsed = time.time() - start
                print(
                    f"[{(ep/self.episodes)*100:5.1f}%] ep={ep:>10,} | "
                    f"P1={wrp:.1f}% P2={wro:.1f}% draw={dr:.1f}% | "
                    f"avg_turns={avg_t:.1f} | eps={eps:.4f} a={alpha:.4f} | {elapsed:.0f}s"
                )
                wins_p = wins_o = draws = total_turns = 0

        total = time.time() - start
        if self.verbose:
            print(f"Training finished in {total:.1f}s ({total/60:.1f} min)")
        self.epsilon = eps
        self.alpha = alpha


def _train_worker(payload: Dict):
    """Worker process: train independently and return Q/visit tables."""
    trainer = UltraFastTrainer(
        mode=payload['mode'],
        episodes=payload['episodes'],
        alpha=payload['alpha'],
        gamma=payload['gamma'],
        epsilon=payload['epsilon'],
        seed=payload['seed'],
        verbose=False,
    )
    trainer.train()
    return {
        'q_p': trainer.q_p,
        'q_o': trainer.q_o,
        'vis_p': trainer.vis_p,
        'vis_o': trainer.vis_o,
    }


def _merge_weighted_q(q_list: List[np.ndarray], vis_list: List[np.ndarray]) -> np.ndarray:
    """Merge Q-tables weighting by visit counts per state-action."""
    total_vis = np.zeros_like(vis_list[0], dtype=np.float64)
    weighted_q = np.zeros_like(q_list[0], dtype=np.float64)

    for q, v in zip(q_list, vis_list):
        vf = v.astype(np.float64)
        total_vis += vf
        weighted_q += q.astype(np.float64) * vf

    out = np.zeros_like(q_list[0], dtype=np.float32)
    mask = total_vis > 0
    out[mask] = (weighted_q[mask] / total_vis[mask]).astype(np.float32)

    # Where nobody visited, fall back to arithmetic mean.
    if np.any(~mask):
        mean_q = np.mean(np.stack(q_list, axis=0), axis=0)
        out[~mask] = mean_q[~mask].astype(np.float32)

    return out


def _softmax_np(values: np.ndarray, temperature: float) -> np.ndarray:
    if temperature <= 0.01:
        out = np.zeros_like(values)
        out[int(np.argmax(values))] = 1.0
        return out
    scaled = values / temperature
    scaled = scaled - np.max(scaled)
    expv = np.exp(scaled)
    return expv / np.sum(expv)


def train_parallel_mode(
    mode: str,
    episodes: int,
    workers: int,
    seed: int | None,
    alpha: float = 0.15,
    gamma: float = 0.95,
    epsilon: float = 0.4,
) -> UltraFastTrainer:
    """Train one mode in parallel workers and merge resulting Q-tables."""
    workers = max(1, workers)
    if workers == 1:
        t = UltraFastTrainer(mode=mode, episodes=episodes, alpha=alpha, gamma=gamma, epsilon=epsilon, seed=seed)
        t.train()
        return t

    print(f"\nParallel training enabled: mode={mode} | workers={workers} | episodes={episodes:,}")

    # Split episodes almost evenly across workers.
    base = episodes // workers
    extra = episodes % workers
    chunks = [base + (1 if i < extra else 0) for i in range(workers)]

    if seed is None:
        seed = int(time.time())

    payloads = []
    for i, ch in enumerate(chunks):
        payloads.append({
            'mode': mode,
            'episodes': ch,
            'alpha': alpha,
            'gamma': gamma,
            'epsilon': epsilon,
            'seed': seed + (i * 9973),
        })

    start = time.time()
    # spawn context is safer on Windows
    with get_context('spawn').Pool(processes=workers) as pool:
        results = pool.map(_train_worker, payloads)

    merged = UltraFastTrainer(mode=mode, episodes=episodes, alpha=alpha, gamma=gamma, epsilon=epsilon, seed=seed)
    merged.q_p = _merge_weighted_q([r['q_p'] for r in results], [r['vis_p'] for r in results])
    merged.q_o = _merge_weighted_q([r['q_o'] for r in results], [r['vis_o'] for r in results])
    merged.vis_p = np.sum(np.stack([r['vis_p'] for r in results], axis=0), axis=0)
    merged.vis_o = np.sum(np.stack([r['vis_o'] for r in results], axis=0), axis=0)

    print(f"Parallel training finished in {time.time() - start:.1f}s")
    return merged


def generate_strategies_for_trainer(trainer: UltraFastTrainer) -> Dict[str, Dict[str, Dict[str, float]]]:
    """Generate hard/medium/easy strategies from merged trainer Q-tables."""
    merged_q = (trainer.q_p + trainer.q_o) * 0.5
    merged_vis = trainer.vis_p + trainer.vis_o

    strategies = {'hard': {}, 'medium': {}, 'easy': {}}
    states_covered = 0
    states_with_data = 0

    for my_life in range(1, trainer.spec.max_life + 1):
        for my_ammo in range(0, MAX_AMMO + 1):
            for opp_life in range(1, trainer.spec.max_life + 1):
                for my_dodge in range(0, MAX_DODGE_STREAK + 1):
                    for my_double in range(0, MAX_DOUBLE_SHOT_USES + 1):
                        acts = trainer.available_actions[(my_ammo, my_double)]
                        if not acts:
                            continue
                        cols = trainer.available_cols[(my_ammo, my_double)]

                        for last_name in trainer.spec.last_card_names:
                            last_code = trainer.spec.last_name_to_code[last_name]
                            idx = trainer._state_index(
                                my_life, my_ammo, opp_life, last_code, my_dodge, my_double
                            )
                            key = f"{my_life}_{my_ammo}_{opp_life}_{last_name}_{my_dodge}_{my_double}"

                            has_data = int(np.sum(merged_vis[idx, cols])) > 0
                            if has_data:
                                states_with_data += 1
                                qvals = merged_q[idx, cols].astype(np.float64)
                                hard = _softmax_np(qvals, 0.3)
                                med = _softmax_np(qvals, 1.5)
                                inv = _softmax_np(-qvals, 0.8)
                                easy = 0.35 * inv + 0.65 * (np.ones_like(inv) / len(inv))
                                easy = easy / np.sum(easy)
                            else:
                                hard = med = easy = np.ones(len(cols), dtype=np.float64) / len(cols)

                            hard_map = {}
                            med_map = {}
                            easy_map = {}
                            for i, c in enumerate(cols):
                                a = trainer.col_to_action[c]
                                an = ACTION_NAMES[a]
                                hard_map[an] = round(float(hard[i]), 4)
                                med_map[an] = round(float(med[i]), 4)
                                easy_map[an] = round(float(easy[i]), 4)

                            for m in (hard_map, med_map, easy_map):
                                total = sum(m.values())
                                if abs(total - 1.0) > 0.0001:
                                    mx = max(m, key=m.get)
                                    m[mx] = round(m[mx] + (1.0 - total), 4)

                            strategies['hard'][key] = hard_map
                            strategies['medium'][key] = med_map
                            strategies['easy'][key] = easy_map
                            states_covered += 1

    print(f"States covered: {states_covered}")
    print(f"States with data: {states_with_data}")
    return strategies


def write_output_for_trainer(trainer: UltraFastTrainer, strategies: Dict, validation: Dict, output_dir: str):
    payload = {
        'meta': {
            'mode': trainer.mode,
            'max_life': trainer.spec.max_life,
            'max_ammo': MAX_AMMO,
            'max_turns': MAX_TURNS,
            'cards': trainer.spec.mode_cards,
            'training_episodes': trainer.episodes,
            'training_date': datetime.now().isoformat(),
            'version': '2.1-ultra-fast-parallel',
            'state_format': '{my_life}_{my_ammo}_{opp_life}_{last_opp_card}_{my_dodge_streak}_{my_double_shots_left}',
            'engine': 'numpy-indexed-qtable-parallel',
        },
        'validation': validation,
        'strategies': strategies,
    }

    os.makedirs(output_dir, exist_ok=True)
    fp = os.path.join(output_dir, f'strategy_{trainer.mode}.json')
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

    fp_dbg = os.path.join(output_dir, f'strategy_{trainer.mode}_debug.json')
    with open(fp_dbg, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Saved: {fp} ({os.path.getsize(fp)/1024:.1f} KB)")
    print(f"Debug: {fp_dbg}")

    @staticmethod
    def _softmax(values: np.ndarray, temperature: float) -> np.ndarray:
        if temperature <= 0.01:
            out = np.zeros_like(values)
            out[int(np.argmax(values))] = 1.0
            return out
        scaled = values / temperature
        scaled = scaled - np.max(scaled)
        expv = np.exp(scaled)
        return expv / np.sum(expv)

    def _build_state_key(self, my_life, my_ammo, opp_life, last_name, my_dodge, my_double):
        return f"{my_life}_{my_ammo}_{opp_life}_{last_name}_{my_dodge}_{my_double}"

    def generate_strategies(self) -> Dict[str, Dict[str, Dict[str, float]]]:
        # Merge both q tables
        merged_q = (self.q_p + self.q_o) * 0.5
        merged_vis = self.vis_p + self.vis_o

        strategies = {'hard': {}, 'medium': {}, 'easy': {}}

        states_covered = 0
        states_with_data = 0

        for my_life in range(1, self.spec.max_life + 1):
            for my_ammo in range(0, MAX_AMMO + 1):
                for opp_life in range(1, self.spec.max_life + 1):
                    for my_dodge in range(0, MAX_DODGE_STREAK + 1):
                        for my_double in range(0, MAX_DOUBLE_SHOT_USES + 1):
                            acts = self.available_actions[(my_ammo, my_double)]
                            if not acts:
                                continue
                            cols = self.available_cols[(my_ammo, my_double)]

                            for last_name in self.spec.last_card_names:
                                last_code = self.spec.last_name_to_code[last_name]
                                idx = self._state_index(
                                    my_life, my_ammo, opp_life, last_code, my_dodge, my_double
                                )

                                key = self._build_state_key(
                                    my_life, my_ammo, opp_life, last_name, my_dodge, my_double
                                )

                                has_data = int(np.sum(merged_vis[idx, cols])) > 0
                                if has_data:
                                    states_with_data += 1
                                    qvals = merged_q[idx, cols].astype(np.float64)
                                    hard = self._softmax(qvals, 0.3)
                                    med = self._softmax(qvals, 1.5)
                                    inv = self._softmax(-qvals, 0.8)
                                    easy = 0.35 * inv + 0.65 * (np.ones_like(inv) / len(inv))
                                    easy = easy / np.sum(easy)
                                else:
                                    hard = med = easy = np.ones(len(cols), dtype=np.float64) / len(cols)

                                hard_map = {}
                                med_map = {}
                                easy_map = {}
                                for i, c in enumerate(cols):
                                    a = self.col_to_action[c]
                                    an = ACTION_NAMES[a]
                                    hard_map[an] = round(float(hard[i]), 4)
                                    med_map[an] = round(float(med[i]), 4)
                                    easy_map[an] = round(float(easy[i]), 4)

                                # Fix floating rounding drift
                                for m in (hard_map, med_map, easy_map):
                                    total = sum(m.values())
                                    if abs(total - 1.0) > 0.0001:
                                        mx = max(m, key=m.get)
                                        m[mx] = round(m[mx] + (1.0 - total), 4)

                                strategies['hard'][key] = hard_map
                                strategies['medium'][key] = med_map
                                strategies['easy'][key] = easy_map
                                states_covered += 1

        print(f"States covered: {states_covered}")
        print(f"States with data: {states_with_data}")
        return strategies

    def write_output(self, strategies: Dict, validation: Dict, output_dir: str):
        payload = {
            'meta': {
                'mode': self.mode,
                'max_life': self.spec.max_life,
                'max_ammo': MAX_AMMO,
                'max_turns': MAX_TURNS,
                'cards': self.spec.mode_cards,
                'training_episodes': self.episodes,
                'training_date': datetime.now().isoformat(),
                'version': '2.0-ultra-fast',
                'state_format': '{my_life}_{my_ammo}_{opp_life}_{last_opp_card}_{my_dodge_streak}_{my_double_shots_left}',
                'engine': 'numpy-indexed-qtable',
            },
            'validation': validation,
            'strategies': strategies,
        }

        os.makedirs(output_dir, exist_ok=True)
        fp = os.path.join(output_dir, f'strategy_{self.mode}.json')
        with open(fp, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))

        fp_dbg = os.path.join(output_dir, f'strategy_{self.mode}_debug.json')
        with open(fp_dbg, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        print(f"Saved: {fp} ({os.path.getsize(fp)/1024:.1f} KB)")
        print(f"Debug: {fp_dbg}")


def main():
    parser = argparse.ArgumentParser(description='Ultra fast Q-learning trainer for Big Bang Duel')
    parser.add_argument('--mode', type=str, required=True, choices=['beginner', 'normal', 'advanced'])
    parser.add_argument('--episodes', type=int, default=2_000_000)
    parser.add_argument('--output', type=str, default='output_ultra')
    parser.add_argument('--validation-games', type=int, default=5000)
    parser.add_argument('--skip-validation', action='store_true')
    parser.add_argument('--workers', type=int, default=1,
                        help='Workers for parallel training in one mode (default: 1)')
    parser.add_argument('--seed', type=int, default=None)
    args = parser.parse_args()

    max_workers = max(1, cpu_count() - 1)
    workers = min(max(1, args.workers), max_workers)

    trainer = train_parallel_mode(
        mode=args.mode,
        episodes=args.episodes,
        workers=workers,
        seed=args.seed,
    )

    print('\nGenerating strategies...')
    strategies = generate_strategies_for_trainer(trainer)

    if args.skip_validation:
        validation = {'skipped': True, 'reason': 'skip-validation flag set'}
    else:
        print(f"\nValidating ({args.validation_games:,} games per matchup)...")
        validation = validate_strategies(strategies, args.mode, num_games=args.validation_games)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(base_dir, args.output)
    write_output_for_trainer(trainer, strategies, validation, out)


if __name__ == '__main__':
    main()
