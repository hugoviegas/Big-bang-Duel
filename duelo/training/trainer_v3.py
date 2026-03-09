#!/usr/bin/env python3
"""
Big Bang Duel — Trainer V3: 5-Turn History with Pattern Bucketing
==================================================================
Nova versão com histórico estendido e MAX_DOUBLE_SHOT_USES=2.

MUDANÇAS EM RELAÇÃO À V2:

1. HISTÓRICO DE 5 JOGADAS — em vez de last/prev (2 cartas), mantemos array
   de 5 últimas jogadas do oponente, transformadas em um "history_bucket"
   (hash estável de padrão) para não explodir o espaço de estados.

   Buckets de padrão detectam:
   - Sequências repetitivas (reload-reload-reload)
   - Alternâncias (shot-dodge-shot-dodge)
   - Mix agressivo vs defensivo
   - Padrões complexos (reload-reload-shot, dodge-dodge-counter, etc.)

2. MAX_DOUBLE_SHOT_USES = 2 (era 3 na v2) — menos usos por partida

3. ESTADO COMPACTO: {vida}_{ammo}_{vida_opp}_{history_bucket}_{dodge}_{double}
   history_bucket = hash de 0-15 cobrindo padrões comuns

4. Mesma estrutura de treino: anti-repetition penalty, random opponent injection,
   temperaturas ajustadas (hard=0.2, medium=2.5, easy=55%worst+45%random)

Estado key format: "{my_life}_{my_ammo}_{opp_life}_{history_bucket}_{my_dodge_streak}_{my_double_shots_left}"
Exemplo: "3_2_2_8_0_2"  (bucket 8 = padrão "reload-shot-reload-shot-dodge")
"""

from __future__ import annotations

import argparse
import json
import os
import random
import time
from dataclasses import dataclass
from datetime import datetime
from multiprocessing import cpu_count, get_context
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

# ─── Action Constants ──────────────────────────────────────────────────────
A_RELOAD  = 0
A_SHOT    = 1
A_DODGE   = 2
A_COUNTER = 3
A_DOUBLE  = 4

ACTION_NAMES = {
    A_RELOAD: 'reload',
    A_SHOT:   'shot',
    A_DODGE:  'dodge',
    A_COUNTER:'counter',
    A_DOUBLE: 'double_shot',
}
NAME_TO_ACTION = {v: k for k, v in ACTION_NAMES.items()}

# ─── Pattern Bucketing ─────────────────────────────────────────────────────
# Convertemos array de 5 cartas em um bucket (0-15) para compactar estados
# Padrões detectados por heurística (frequência, alternação, tendência)

def compute_history_bucket(history: List[int]) -> int:
    """
    Transforma array de 5 códigos de carta (0-5) em bucket 0-15.
    Se history < 5, preenche com 0 (none).
    
    Bucketing heurístico:
      0-3:   padrão totalmente defensivo (reload+dodge dominante)
      4-7:   padrão misto leve (reload+shot ocasional)
      8-11:  padrão agressivo (shot+double_shot frequente)
      12-15: padrão ultra-agressivo ou errático
    """
    h5 = (history + [0] * 5)[:5]  # garante 5 elementos
    
    # Contadores básicos
    reload_count  = h5.count(1)  # reload=1 no card_to_last_code
    shot_count    = h5.count(2)  # shot=2
    dodge_count   = h5.count(3)  # dodge=3
    counter_count = h5.count(4)  # counter=4
    double_count  = h5.count(5)  # double_shot=5
    
    aggressive = shot_count + double_count + counter_count
    defensive  = dodge_count + reload_count
    
    # Alternação (sequência não-repetitiva)
    alternates = sum(1 for i in range(4) if h5[i] != h5[i+1])
    
    # Heurística simples
    if aggressive >= 4:
        return 12 + min(3, alternates)  # 12-15: ultra-agressivo
    elif aggressive >= 3:
        return 8 + min(3, alternates)   # 8-11: agressivo
    elif aggressive >= 2:
        return 4 + min(3, defensive)    # 4-7: misto
    else:
        return min(3, defensive)        # 0-3: defensivo
    
    # Fallback se todos são none
    return 0


# ─── Penalties ──────────────────────────────────────────────────────────────
REP_PENALTY          = -1.5   # Penalty por repetir mesma ação 3x consecutivo
EARLY_DODGE_PENALTY  = -3.0   # Penalty por dodge nos primeiros turnos (turn <= 2)
RELOAD_VS_AGGRO_PEN  = -1.5   # Penalty por reload quando oponente é agressivo (bucket >= 8)
DODGE_NO_THREAT_PEN  = -1.0   # Penalty por dodge quando oponente não tem ammo (score baixo)
WASTED_COUNTER_PEN   = -0.8   # Penalty por counter quando oponente provavelmente não atira


# ─── Data Classes ─────────────────────────────────────────────────────────

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
    num_buckets: int


@dataclass
class EpisodeResult:
    winner: int
    turns: int


# ─── Trainer ──────────────────────────────────────────────────────────────

class History5Trainer:
    """
    Q-Learning com histórico de 5 jogadas transformado em bucket (0-15).
    """

    def __init__(
        self,
        mode: str,
        episodes: int,
        alpha: float = 0.15,
        gamma: float = 0.95,
        epsilon: float = 0.4,
        random_opp_ratio: float = 0.25,
        seed: int | None = None,
        verbose: bool = True,
    ):
        self.mode = mode
        self.episodes = episodes
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.random_opp_ratio = random_opp_ratio
        self.verbose = verbose

        if seed is None:
            seed = int(time.time())
        self.rng = random.Random(seed)

        self.spec = self._build_mode_spec(mode)
        self.action_to_col = {a: i for i, a in enumerate(self.spec.mode_action_ids)}
        self.col_to_action = {i: a for i, a in enumerate(self.spec.mode_action_ids)}

        self._build_precomputed_actions()

        n_states  = self.spec.state_count
        n_actions = len(self.spec.mode_action_ids)

        self.q_p   = np.zeros((n_states, n_actions), dtype=np.float32)
        self.q_o   = np.zeros((n_states, n_actions), dtype=np.float32)
        self.vis_p = np.zeros((n_states, n_actions), dtype=np.int32)
        self.vis_o = np.zeros((n_states, n_actions), dtype=np.int32)

    # ── Setup ────────────────────────────────────────────────────────────

    def _build_mode_spec(self, mode: str) -> ModeSpec:
        max_life        = LIFE_BY_MODE[mode]
        mode_cards      = CARDS_BY_MODE[mode]
        mode_action_ids = [NAME_TO_ACTION[n] for n in mode_cards]
        last_card_names = ['none'] + mode_cards
        last_name_to_code = {n: i for i, n in enumerate(last_card_names)}
        card_to_last_code = {NAME_TO_ACTION[n]: last_name_to_code[n] for n in mode_cards}
        
        num_buckets = 16  # 0-15
        
        # Estado: vida * ammo * vida_opp * history_bucket * dodge * double
        state_count = (
            max_life
            * (MAX_AMMO + 1)
            * max_life
            * num_buckets
            * (MAX_DODGE_STREAK + 1)
            * (MAX_DOUBLE_SHOT_USES + 1)
        )

        return ModeSpec(
            mode=mode,
            max_life=max_life,
            mode_cards=mode_cards,
            mode_action_ids=mode_action_ids,
            last_card_names=last_card_names,
            last_name_to_code=last_name_to_code,
            card_to_last_code=card_to_last_code,
            state_count=state_count,
            num_buckets=num_buckets,
        )

    def _build_precomputed_actions(self):
        self.available_cols: Dict[Tuple[int, int, int], List[int]] = {}
        for ammo in range(MAX_AMMO + 1):
            for dleft in range(MAX_DOUBLE_SHOT_USES + 1):
                for dstreak in range(MAX_DODGE_STREAK + 1):
                    out = []
                    for a in self.spec.mode_action_ids:
                        if a == A_SHOT    and ammo < 1:          continue
                        if a == A_COUNTER and ammo < 1:          continue
                        if a == A_DOUBLE  and (ammo < 2 or dleft <= 0): continue
                        if a == A_DODGE   and dstreak >= MAX_DODGE_STREAK: continue
                        out.append(self.action_to_col[a])
                    if not out:
                        out = [self.action_to_col[A_RELOAD]]
                    self.available_cols[(ammo, dleft, dstreak)] = out

    # ── State Index ──────────────────────────────────────────────────────

    def _state_index(
        self,
        my_life: int,
        my_ammo: int,
        opp_life: int,
        opp_history_bucket: int,
        my_dodge: int,
        my_double: int,
    ) -> int:
        ml = self.spec.max_life
        nb = self.spec.num_buckets
        idx = my_life - 1
        idx = idx * (MAX_AMMO + 1)            + my_ammo
        idx = idx * ml                        + (opp_life - 1)
        idx = idx * nb                        + opp_history_bucket
        idx = idx * (MAX_DODGE_STREAK + 1)    + my_dodge
        idx = idx * (MAX_DOUBLE_SHOT_USES + 1) + my_double
        return idx

    # ── Action Selection ─────────────────────────────────────────────────

    def _choose_col(self, q_row: np.ndarray, cols: List[int], epsilon: float) -> int:
        if self.rng.random() < epsilon:
            return cols[self.rng.randrange(len(cols))]
        best = -1e30
        best_list: List[int] = []
        for c in cols:
            v = float(q_row[c])
            if v > best:
                best = v
                best_list = [c]
            elif v == best:
                best_list.append(c)
        return best_list[self.rng.randrange(len(best_list))]

    # ── Resolve Turn ─────────────────────────────────────────────────────

    def _resolve_turn(
        self,
        p_action: int, o_action: int,
        p_ammo: int,   o_ammo: int,
    ) -> Tuple[int, int, int, int]:
        p_acost = {A_SHOT: -1, A_COUNTER: -1, A_DOUBLE: -2}.get(p_action, 0)
        o_acost = {A_SHOT: -1, A_COUNTER: -1, A_DOUBLE: -2}.get(o_action, 0)
        p_ll = o_ll = 0

        if   p_action == A_SHOT   and o_action == A_SHOT:    p_ll=1; o_ll=1
        elif p_action == A_SHOT   and o_action == A_DOUBLE:  p_ll=2; o_ll=1
        elif p_action == A_SHOT   and o_action == A_DODGE:   pass
        elif p_action == A_SHOT   and o_action == A_RELOAD:  o_ll=1
        elif p_action == A_SHOT   and o_action == A_COUNTER: p_ll=1

        elif p_action == A_DOUBLE and o_action == A_SHOT:    p_ll=1; o_ll=2
        elif p_action == A_DOUBLE and o_action == A_DOUBLE:  p_ll=2; o_ll=2
        elif p_action == A_DOUBLE and o_action == A_DODGE:   o_ll=1
        elif p_action == A_DOUBLE and o_action == A_RELOAD:  o_ll=2
        elif p_action == A_DOUBLE and o_action == A_COUNTER: p_ll=1

        elif p_action == A_DODGE  and o_action == A_SHOT:    pass
        elif p_action == A_DODGE  and o_action == A_DOUBLE:  p_ll=1
        elif p_action == A_DODGE  and o_action == A_DODGE:   pass
        elif p_action == A_DODGE  and o_action == A_RELOAD:  pass
        elif p_action == A_DODGE  and o_action == A_COUNTER: pass

        elif p_action == A_RELOAD and o_action == A_SHOT:    p_ll=1
        elif p_action == A_RELOAD and o_action == A_DOUBLE:  p_ll=2
        elif p_action == A_RELOAD:                            pass

        elif p_action == A_COUNTER and o_action == A_SHOT:   o_ll=1
        elif p_action == A_COUNTER and o_action == A_DOUBLE: o_ll=1
        elif p_action == A_COUNTER:                           pass

        if p_action == A_RELOAD:
            p_acost = 1 if p_ammo < MAX_AMMO else 0
        if o_action == A_RELOAD:
            o_acost = 1 if o_ammo < MAX_AMMO else 0

        return p_ll, o_ll, p_acost, o_acost

    # ── Winner ───────────────────────────────────────────────────────────

    def _winner(self, p_life: int, o_life: int, turn: int) -> int | None:
        if p_life <= 0 and o_life <= 0: return 0
        if p_life <= 0:                  return -1
        if o_life <= 0:                  return 1
        if turn > MAX_TURNS:
            if p_life > o_life: return 1
            if o_life > p_life: return -1
            r = 0
            while True:
                shooter = 1 if (r % 2 == 0) else -1
                if self.rng.random() < (1.0 / 6.0):
                    return shooter
                r += 1
        return None

    # ── Reward ───────────────────────────────────────────────────────────

    @staticmethod
    def _reward(
        p_life_lost: int,
        o_life_lost: int,
        winner: int | None,
        perspective: int,
        rep_penalty: float = 0.0,
        context_penalty: float = 0.0,
    ) -> float:
        if perspective == 1:
            my_lost, opp_lost = p_life_lost, o_life_lost
            win_key = 1
        else:
            my_lost, opp_lost = o_life_lost, p_life_lost
            win_key = -1

        r = opp_lost * 5.0 - my_lost * 5.0 - 0.3 + rep_penalty + context_penalty
        if winner is not None:
            if winner == win_key:   r += 100.0
            elif winner != 0:       r -= 100.0
            else:                   r -= 5.0
        return r

    # ── Context-Aware Penalty ────────────────────────────────────────────

    def _compute_context_penalty(
        self,
        action: int,
        turn: int,
        opp_ammo: int,
        opp_history_bucket: int,
        my_ammo: int,
    ) -> float:
        """
        Penalidades inteligentes baseadas no contexto do jogo.
        Ensina a IA a evitar jogadas irracionais:

        1. EARLY DODGE: Desviar nos primeiros turns é inútil — oponente não
           tem ammo para atirar, melhor recarregar e ganhar vantagem.

        2. RELOAD vs AGGRO: Recarregar quando o oponente é agressivo
           (bucket >= 8) é arriscado — oponente provavelmente vai atirar.

        3. DODGE SEM AMEAÇA: Desviar quando oponente tem 0 ammo é desperdício
           (ele não pode atirar, então dodge não protege de nada).

        4. COUNTER DESPERDIÇADO: Usar counter quando oponente provavelmente
           não vai atirar (bucket defensivo) gasta munição sem benefício.
        """
        penalty = 0.0

        # 1. Early-game dodge penalty (turn 1-2: ninguém tem ammo ainda)
        if action == A_DODGE and turn <= 2:
            penalty += EARLY_DODGE_PENALTY

        # 2. Reload quando oponente é agressivo (buckets 8-15 = agressivo/ultra)
        if action == A_RELOAD and opp_history_bucket >= 8 and opp_ammo > 0:
            penalty += RELOAD_VS_AGGRO_PEN

        # 3. Dodge quando oponente não tem munição (nenhuma ameaça)
        if action == A_DODGE and opp_ammo == 0 and turn > 2:
            penalty += DODGE_NO_THREAT_PEN

        # 4. Counter quando oponente é defensivo (bucket 0-3) e tem pouca ammo
        if action == A_COUNTER and opp_history_bucket <= 3 and opp_ammo <= 1:
            penalty += WASTED_COUNTER_PEN

        return penalty

    # ── Episode State ────────────────────────────────────────────────────

    def _initial_state(self) -> dict:
        ml = self.spec.max_life
        return {
            'p_life': ml, 'o_life': ml,
            'p_ammo': 0,  'o_ammo': 0,
            'p_dodge': 0, 'o_dodge': 0,
            'p_double': MAX_DOUBLE_SHOT_USES,
            'o_double': MAX_DOUBLE_SHOT_USES,
            'p_history': [],     # array de códigos (últimas 5)
            'o_history': [],     # idem
            'last_p_act': -1, 'last_o_act': -1,
            'prev_p_act': -2, 'prev_o_act': -2,
            'turn': 1,
        }

    def _random_start_state(self) -> dict:
        ml = self.spec.max_life
        s = self._initial_state()
        s.update({
            'p_life': self.rng.randint(1, ml),
            'o_life': self.rng.randint(1, ml),
            'p_ammo': self.rng.randint(0, MAX_AMMO),
            'o_ammo': self.rng.randint(0, MAX_AMMO),
            'p_dodge': self.rng.randint(0, MAX_DODGE_STREAK),
            'o_dodge': self.rng.randint(0, MAX_DODGE_STREAK),
            'p_double': self.rng.randint(0, MAX_DOUBLE_SHOT_USES),
            'o_double': self.rng.randint(0, MAX_DOUBLE_SHOT_USES),
            'p_history': [self.rng.randint(0, 5) for _ in range(self.rng.randint(0, 5))],
            'o_history': [self.rng.randint(0, 5) for _ in range(self.rng.randint(0, 5))],
            'turn': self.rng.randint(1, 30),
        })
        return s

    # ── Episode ──────────────────────────────────────────────────────────

    def _play_episode(self, epsilon: float, alpha: float) -> EpisodeResult:
        s = self._random_start_state() if self.rng.random() < 0.3 else self._initial_state()

        rand_p = self.rng.random() < self.random_opp_ratio / 2
        rand_o = self.rng.random() < self.random_opp_ratio / 2

        while True:
            p_cols = self.available_cols[(s['p_ammo'], s['p_double'], s['p_dodge'])]
            o_cols = self.available_cols[(s['o_ammo'], s['o_double'], s['o_dodge'])]

            p_bucket = compute_history_bucket(s['o_history'][-5:])
            o_bucket = compute_history_bucket(s['p_history'][-5:])

            p_sidx = self._state_index(
                s['p_life'], s['p_ammo'], s['o_life'],
                p_bucket, s['p_dodge'], s['p_double']
            )
            o_sidx = self._state_index(
                s['o_life'], s['o_ammo'], s['p_life'],
                o_bucket, s['o_dodge'], s['o_double']
            )

            if rand_p:
                p_col = p_cols[self.rng.randrange(len(p_cols))]
            else:
                p_col = self._choose_col(self.q_p[p_sidx], p_cols, epsilon)

            if rand_o:
                o_col = o_cols[self.rng.randrange(len(o_cols))]
            else:
                o_col = self._choose_col(self.q_o[o_sidx], o_cols, epsilon)

            p_action = self.col_to_action[p_col]
            o_action = self.col_to_action[o_col]

            # Anti-repetição
            p_rep = REP_PENALTY if (p_action == s['last_p_act'] == s['prev_p_act']) else 0.0
            o_rep = REP_PENALTY if (o_action == s['last_o_act'] == s['prev_o_act']) else 0.0

            # Context-aware penalties (jogadas irracionais)
            p_ctx = self._compute_context_penalty(
                p_action, s['turn'], s['o_ammo'], p_bucket, s['p_ammo']
            )
            o_ctx = self._compute_context_penalty(
                o_action, s['turn'], s['p_ammo'], o_bucket, s['o_ammo']
            )

            # Resolver turno
            p_ll, o_ll, p_ac, o_ac = self._resolve_turn(
                p_action, o_action, s['p_ammo'], s['o_ammo']
            )

            s['p_life'] = max(0, s['p_life'] - p_ll)
            s['o_life'] = max(0, s['o_life'] - o_ll)
            s['p_ammo'] = min(MAX_AMMO, max(0, s['p_ammo'] + p_ac))
            s['o_ammo'] = min(MAX_AMMO, max(0, s['o_ammo'] + o_ac))

            s['p_dodge'] = min(MAX_DODGE_STREAK, s['p_dodge'] + 1) if p_action == A_DODGE else 0
            s['o_dodge'] = min(MAX_DODGE_STREAK, s['o_dodge'] + 1) if o_action == A_DODGE else 0

            if p_action == A_DOUBLE: s['p_double'] = max(0, s['p_double'] - 1)
            if o_action == A_DOUBLE: s['o_double'] = max(0, s['o_double'] - 1)

            s['turn'] += 1
            winner = self._winner(s['p_life'], s['o_life'], s['turn'])
            done = winner is not None

            r_p = self._reward(p_ll, o_ll, winner, perspective=1,  rep_penalty=p_rep, context_penalty=p_ctx)
            r_o = self._reward(p_ll, o_ll, winner, perspective=-1, rep_penalty=o_rep, context_penalty=o_ctx)

            # Atualizar históricos (mantém últimos 5)
            p_code = self.spec.card_to_last_code[p_action]
            o_code = self.spec.card_to_last_code[o_action]
            s['p_history'].append(p_code)
            s['o_history'].append(o_code)
            if len(s['p_history']) > 5: s['p_history'].pop(0)
            if len(s['o_history']) > 5: s['o_history'].pop(0)

            s['prev_p_act'] = s['last_p_act']
            s['prev_o_act'] = s['last_o_act']
            s['last_p_act'] = p_action
            s['last_o_act'] = o_action

            # Q-update
            self.vis_p[p_sidx, p_col] += 1
            self.vis_o[o_sidx, o_col] += 1

            if done:
                target_p = r_p
                target_o = r_o
            else:
                next_p_bucket = compute_history_bucket(s['o_history'][-5:])
                next_o_bucket = compute_history_bucket(s['p_history'][-5:])
                next_p_sidx = self._state_index(
                    s['p_life'], s['p_ammo'], s['o_life'],
                    next_p_bucket, s['p_dodge'], s['p_double']
                )
                next_o_sidx = self._state_index(
                    s['o_life'], s['o_ammo'], s['p_life'],
                    next_o_bucket, s['o_dodge'], s['o_double']
                )
                next_p_cols = self.available_cols[(s['p_ammo'], s['p_double'], s['p_dodge'])]
                next_o_cols = self.available_cols[(s['o_ammo'], s['o_double'], s['o_dodge'])]

                max_next_p = max(float(self.q_p[next_p_sidx, c]) for c in next_p_cols)
                max_next_o = max(float(self.q_o[next_o_sidx, c]) for c in next_o_cols)

                target_p = r_p + self.gamma * max_next_p
                target_o = r_o + self.gamma * max_next_o

            self.q_p[p_sidx, p_col] += alpha * (target_p - self.q_p[p_sidx, p_col])
            self.q_o[o_sidx, o_col] += alpha * (target_o - self.q_o[o_sidx, o_col])

            if done:
                return EpisodeResult(
                    winner=winner if winner is not None else 0,
                    turns=s['turn'] - 1,
                )

    # ── Training Loop ────────────────────────────────────────────────────

    def train(self):
        start = time.time()
        if self.verbose:
            print(f"\n{'=' * 70}")
            print(f"HISTORY-5 TRAINER V3 | mode={self.mode} | episodes={self.episodes:,}")
            print(f"state_count={self.spec.state_count:,} | buckets={self.spec.num_buckets}")
            print(f"actions={self.spec.mode_cards}")
            print(f"random_opp_ratio={self.random_opp_ratio:.1%} | rep_penalty={REP_PENALTY}")
            print(f"MAX_DODGE_STREAK={MAX_DODGE_STREAK} | MAX_DOUBLE_SHOT_USES={MAX_DOUBLE_SHOT_USES}")
            print(f"Context penalties: early_dodge={EARLY_DODGE_PENALTY} reload_vs_aggro={RELOAD_VS_AGGRO_PEN}")
            print(f"  dodge_no_threat={DODGE_NO_THREAT_PEN} wasted_counter={WASTED_COUNTER_PEN}")
            print(f"{'=' * 70}")

        eps   = self.epsilon
        alpha = self.alpha
        wins_p = wins_o = draws = total_turns = 0
        report_interval = max(1, self.episodes // 20)

        for ep in range(1, self.episodes + 1):
            out = self._play_episode(eps, alpha)
            if out.winner == 1:    wins_p += 1
            elif out.winner == -1: wins_o += 1
            else:                  draws += 1
            total_turns += out.turns

            eps   = max(0.02, eps   * 0.999997)
            alpha = max(0.01, alpha * 0.999999)

            if self.verbose and ep % report_interval == 0:
                games = report_interval
                elapsed = time.time() - start
                print(
                    f"[{ep/self.episodes*100:5.1f}%] ep={ep:>10,} | "
                    f"P1={wins_p/games*100:.1f}% P2={wins_o/games*100:.1f}% "
                    f"draw={draws/games*100:.1f}% | "
                    f"avg_t={total_turns/games:.1f} | "
                    f"eps={eps:.4f} a={alpha:.4f} | {elapsed:.0f}s"
                )
                wins_p = wins_o = draws = total_turns = 0

        if self.verbose:
            print(f"Training finished in {time.time()-start:.1f}s ({(time.time()-start)/60:.1f} min)")
        self.epsilon = eps
        self.alpha   = alpha


# ─── Parallel Training ────────────────────────────────────────────────────

def _train_worker_v3(payload: dict) -> dict:
    trainer = History5Trainer(
        mode=payload['mode'],
        episodes=payload['episodes'],
        alpha=payload['alpha'],
        gamma=payload['gamma'],
        epsilon=payload['epsilon'],
        random_opp_ratio=payload['random_opp_ratio'],
        seed=payload['seed'],
        verbose=False,
    )
    trainer.train()
    return {
        'q_p':   trainer.q_p,
        'q_o':   trainer.q_o,
        'vis_p': trainer.vis_p,
        'vis_o': trainer.vis_o,
    }


def _merge_weighted_q(
    q_list: list[np.ndarray],
    vis_list: list[np.ndarray],
) -> np.ndarray:
    total_vis  = np.zeros_like(vis_list[0],  dtype=np.float64)
    weighted_q = np.zeros_like(q_list[0],    dtype=np.float64)
    for q, v in zip(q_list, vis_list):
        vf = v.astype(np.float64)
        total_vis  += vf
        weighted_q += q.astype(np.float64) * vf
    out = np.zeros_like(q_list[0], dtype=np.float32)
    mask = total_vis > 0
    out[mask] = (weighted_q[mask] / total_vis[mask]).astype(np.float32)
    if np.any(~mask):
        mean_q = np.mean(np.stack(q_list), axis=0)
        out[~mask] = mean_q[~mask].astype(np.float32)
    return out


def train_parallel_v3(
    mode: str,
    episodes: int,
    workers: int,
    seed: int | None,
    alpha: float = 0.15,
    gamma: float = 0.95,
    epsilon: float = 0.4,
    random_opp_ratio: float = 0.25,
) -> History5Trainer:
    workers = max(1, workers)
    if workers == 1:
        t = History5Trainer(
            mode=mode, episodes=episodes,
            alpha=alpha, gamma=gamma, epsilon=epsilon,
            random_opp_ratio=random_opp_ratio, seed=seed,
        )
        t.train()
        return t

    print(f"\nParallel training: mode={mode} | workers={workers} | episodes={episodes:,}")
    base  = episodes // workers
    extra = episodes % workers
    chunks = [base + (1 if i < extra else 0) for i in range(workers)]

    if seed is None:
        seed = int(time.time())

    payloads = [
        {
            'mode': mode,
            'episodes': ch,
            'alpha': alpha,
            'gamma': gamma,
            'epsilon': epsilon,
            'random_opp_ratio': random_opp_ratio,
            'seed': seed + i * 9973,
        }
        for i, ch in enumerate(chunks)
    ]

    start = time.time()
    with get_context('spawn').Pool(processes=workers) as pool:
        results = pool.map(_train_worker_v3, payloads)

    merged = History5Trainer(
        mode=mode, episodes=episodes,
        alpha=alpha, gamma=gamma, epsilon=epsilon,
        random_opp_ratio=random_opp_ratio, seed=seed,
    )
    merged.q_p   = _merge_weighted_q([r['q_p']   for r in results], [r['vis_p'] for r in results])
    merged.q_o = _merge_weighted_q([r['q_o']   for r in results], [r['vis_o'] for r in results])
    merged.vis_p = np.sum(np.stack([r['vis_p'] for r in results]), axis=0)
    merged.vis_o = np.sum(np.stack([r['vis_o'] for r in results]), axis=0)

    print(f"Parallel training finished in {time.time()-start:.1f}s")
    return merged


# ─── Strategy Generation ─────────────────────────────────────────────────

def _softmax(values: np.ndarray, temperature: float) -> np.ndarray:
    if temperature <= 0.01:
        out = np.zeros_like(values)
        out[int(np.argmax(values))] = 1.0
        return out
    scaled = values / temperature
    scaled -= np.max(scaled)
    expv = np.exp(scaled)
    return expv / np.sum(expv)


def generate_strategies_v3(trainer: History5Trainer) -> dict:
    merged_q   = (trainer.q_p + trainer.q_o) * 0.5
    merged_vis = trainer.vis_p + trainer.vis_o

    strategies = {'hard': {}, 'medium': {}, 'easy': {}}
    states_total = states_with_data = 0

    spec = trainer.spec
    for my_life in range(1, spec.max_life + 1):
        for my_ammo in range(MAX_AMMO + 1):
            for opp_life in range(1, spec.max_life + 1):
                for my_dodge in range(MAX_DODGE_STREAK + 1):
                    for my_double in range(MAX_DOUBLE_SHOT_USES + 1):
                        cols = trainer.available_cols.get(
                            (my_ammo, my_double, my_dodge),
                            trainer.available_cols.get((my_ammo, my_double, 0), [])
                        )
                        if not cols:
                            continue

                        for bucket in range(spec.num_buckets):
                            idx = trainer._state_index(
                                my_life, my_ammo, opp_life,
                                bucket, my_dodge, my_double,
                            )
                            key = f"{my_life}_{my_ammo}_{opp_life}_{bucket}_{my_dodge}_{my_double}"

                            has_data = int(np.sum(merged_vis[idx, cols])) > 0
                            if has_data:
                                states_with_data += 1
                                qvals = merged_q[idx, cols].astype(np.float64)

                                hard_probs = _softmax(qvals, 0.2)
                                med_probs  = _softmax(qvals, 2.5)
                                worst      = _softmax(-qvals, 0.5)
                                uniform    = np.ones(len(cols)) / len(cols)
                                easy_probs = 0.55 * worst + 0.45 * uniform
                                easy_probs /= easy_probs.sum()
                            else:
                                hard_probs = med_probs = easy_probs = (
                                    np.ones(len(cols)) / len(cols)
                                )

                            def _to_map(probs):
                                m = {
                                    ACTION_NAMES[trainer.col_to_action[c]]: round(float(p), 4)
                                    for c, p in zip(cols, probs)
                                }
                                total = sum(m.values())
                                if abs(total - 1.0) > 0.0001:
                                    mx = max(m, key=m.get)
                                    m[mx] = round(m[mx] + (1.0 - total), 4)
                                return m

                            strategies['hard'][key]   = _to_map(hard_probs)
                            strategies['medium'][key] = _to_map(med_probs)
                            strategies['easy'][key]   = _to_map(easy_probs)
                            states_total += 1

    print(f"States covered: {states_total:,}  |  States with data: {states_with_data:,}")
    return strategies


# ─── Validation ──────────────────────────────────────────────────────────

def validate_v3(
    strategies: dict,
    mode: str,
    num_games: int = 2000,
) -> dict:
    from game_engine import CARDS_BY_MODE, LIFE_BY_MODE, MAX_AMMO, MAX_TURNS, resolve_cards

    rng = random.Random(42)
    hard_strat = strategies['hard']
    mode_cards = CARDS_BY_MODE[mode]

    wins = draws = losses = total_turns = 0

    for _ in range(num_games):
        ml = LIFE_BY_MODE[mode]
        p_life = ml;   o_life = ml
        p_ammo = 0;    o_ammo = 0
        p_dodge = 0;   p_double = MAX_DOUBLE_SHOT_USES
        o_history = []  # histórico do oponente (5 últimas)
        turn = 1

        # Mapear nomes -> códigos
        card_name_to_code = {'none': 0, 'reload': 1, 'shot': 2, 'dodge': 3, 'counter': 4, 'double_shot': 5}

        while True:
            bucket = compute_history_bucket(o_history[-5:] if o_history else [])
            key = f"{p_life}_{p_ammo}_{o_life}_{bucket}_{p_dodge}_{p_double}"
            probs = hard_strat.get(key)
            avail_p = [
                c for c in mode_cards
                if not (c == 'shot' and p_ammo < 1)
                and not (c == 'double_shot' and (p_ammo < 2 or p_double <= 0))
                and not (c == 'counter' and p_ammo < 1)
                and not (c == 'dodge' and p_dodge >= MAX_DODGE_STREAK)
            ]
            if probs and avail_p:
                r = rng.random()
                cum = 0.0
                p_card = avail_p[-1]
                for card in avail_p:
                    cum += probs.get(card, 0.0)
                    if r <= cum:
                        p_card = card
                        break
            else:
                p_card = rng.choice(avail_p) if avail_p else 'reload'

            # Oponente aleatório
            avail_o = [
                c for c in mode_cards
                if not (c == 'shot' and o_ammo < 1)
                and not (c == 'double_shot' and o_ammo < 2)
                and not (c == 'counter' and o_ammo < 1)
            ]
            o_card = rng.choice(avail_o) if avail_o else 'reload'

            # Resolver
            res = resolve_cards(p_card, o_card, p_ammo, o_ammo)
            p_life = max(0, p_life - res['p_life_lost'])
            o_life = max(0, o_life - res['o_life_lost'])
            p_ammo = min(MAX_AMMO, max(0, p_ammo + res['p_ammo_change']))
            o_ammo = min(MAX_AMMO, max(0, o_ammo + res['o_ammo_change']))
            p_dodge = min(MAX_DODGE_STREAK, p_dodge + 1) if p_card == 'dodge' else 0
            if p_card == 'double_shot': p_double = max(0, p_double - 1)

            # Atualizar histórico do oponente
            o_history.append(card_name_to_code.get(o_card, 0))
            if len(o_history) > 5:
                o_history.pop(0)

            turn += 1

            if p_life <= 0 and o_life <= 0: draws += 1; total_turns += turn; break
            if p_life <= 0:                  losses += 1; total_turns += turn; break
            if o_life <= 0:                  wins   += 1; total_turns += turn; break
            if turn > MAX_TURNS:
                if p_life > o_life:          wins   += 1
                elif o_life > p_life:        losses += 1
                else:                        draws  += 1
                total_turns += turn; break

    return {
        'hard_vs_random': {
            'win_rate':  round(wins   / num_games, 4),
            'draw_rate': round(draws  / num_games, 4),
            'loss_rate': round(losses / num_games, 4),
            'avg_turns': round(total_turns / num_games, 2),
            'games':     num_games,
        }
    }


# ─── Output ───────────────────────────────────────────────────────────────

def write_output_v3(
    trainer: History5Trainer,
    strategies: dict,
    validation: dict,
    output_dir: str,
):
    payload = {
        'meta': {
            'mode': trainer.mode,
            'max_life': trainer.spec.max_life,
            'max_ammo': MAX_AMMO,
            'max_turns': MAX_TURNS,
            'max_dodge_streak': MAX_DODGE_STREAK,
            'max_double_shot_uses': MAX_DOUBLE_SHOT_USES,
            'cards': trainer.spec.mode_cards,
            'training_episodes': trainer.episodes,
            'training_date': datetime.now().isoformat(),
            'version': '4.0-history5-bucket',
            'state_format': '{my_life}_{my_ammo}_{opp_life}_{history_bucket}_{my_dodge_streak}_{my_double_shots_left}',
            'history_buckets': trainer.spec.num_buckets,
            'engine': 'numpy-indexed-qtable-v3-history5',
            'features': [
                'history_5_turns_bucketing',
                'anti_repetition_penalty',
                'random_opp_injection',
                'dodge_streak_filtering',
                'double_shot_uses_2',
                'context_aware_penalties',
                'early_dodge_penalty',
                'reload_vs_aggro_penalty',
                'dodge_no_threat_penalty',
                'wasted_counter_penalty',
            ],
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

    print(f"Saved : {fp} ({os.path.getsize(fp)/1024:.1f} KB)")
    print(f"Debug : {fp_dbg}")


# ─── CLI ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Big Bang Duel — History-5 Q-Learning Trainer V3',
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument('--mode',             required=True, choices=['beginner', 'normal', 'advanced'])
    parser.add_argument('--episodes',         type=int,   default=2_000_000)
    parser.add_argument('--output',           type=str,   default='output_v3')
    parser.add_argument('--validation-games', type=int,   default=3000)
    parser.add_argument('--skip-validation',  action='store_true')
    parser.add_argument('--workers',          type=int,   default=1)
    parser.add_argument('--seed',             type=int,   default=None)
    parser.add_argument('--random-opp-ratio', type=float, default=0.25)
    args = parser.parse_args()

    max_workers = max(1, cpu_count() - 1)
    workers = min(max(1, args.workers), max_workers)

    trainer = train_parallel_v3(
        mode=args.mode,
        episodes=args.episodes,
        workers=workers,
        seed=args.seed,
        random_opp_ratio=args.random_opp_ratio,
    )

    print('\nGerando estratégias...')
    strategies = generate_strategies_v3(trainer)

    if args.skip_validation:
        validation = {'skipped': True}
    else:
        print(f'\nValidando ({args.validation_games:,} jogos)...')
        validation = validate_v3(strategies, args.mode, num_games=args.validation_games)
        vr = validation.get('hard_vs_random', {})
        print(
            f"hard vs random: win={vr.get('win_rate', 0):.1%} "
            f"draw={vr.get('draw_rate', 0):.1%} "
            f"loss={vr.get('loss_rate', 0):.1%} "
            f"avg_turns={vr.get('avg_turns', 0):.1f}"
        )

    base_dir = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(base_dir, args.output)
    write_output_v3(trainer, strategies, validation, out)


if __name__ == '__main__':
    main()
