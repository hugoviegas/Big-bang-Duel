"""
Big Bang Duel — Python Game Engine
===================================
Réplica EXATA da lógica TypeScript (gameEngine.ts).
Usado para treinar a IA do bot através de self-play.

Regras principais:
- 3 modos: beginner (3 cartas, 3 HP), normal (4 cartas, 4 HP), advanced (5 cartas, 4 HP)
- Cartas: reload, shot, dodge, double_shot, counter
- Jogo simultâneo — ambos escolhem ao mesmo tempo
- Máx munição: 3, todos começam com 0
- Reload SEMPRE dá munição, mesmo quando interrompido por tiro
"""

from typing import List, Dict, Optional

# ─── Card Constants ─────────────────────────────────────────────────────────
CARD_RELOAD = 'reload'
CARD_SHOT = 'shot'
CARD_DODGE = 'dodge'
CARD_DOUBLE_SHOT = 'double_shot'
CARD_COUNTER = 'counter'

# ─── Mode Definitions ──────────────────────────────────────────────────────
CARDS_BY_MODE: Dict[str, List[str]] = {
    'beginner': [CARD_RELOAD, CARD_SHOT, CARD_DODGE],
    'normal':   [CARD_RELOAD, CARD_SHOT, CARD_DODGE, CARD_DOUBLE_SHOT],
    'advanced': [CARD_RELOAD, CARD_SHOT, CARD_DODGE, CARD_COUNTER, CARD_DOUBLE_SHOT],
}

LIFE_BY_MODE: Dict[str, int] = {
    'beginner': 3,
    'normal':   4,
    'advanced': 4,
}

MAX_AMMO = 3
MAX_TURNS = 50
MAX_DODGE_STREAK = 3  # Sincronizado com TypeScript: máx 3 esquivas consecutivas
MAX_DOUBLE_SHOT_USES = 2


def get_available_cards(
    mode: str,
    ammo: int,
    double_shots_left: int = MAX_DOUBLE_SHOT_USES,
    dodge_streak: int = 0,
) -> List[str]:
    """Retorna cartas disponíveis baseado no modo, munição atual e usos de double_shot restantes.
    Espelha exatamente getAvailableCards() do TypeScript, incluindo bloqueio de dodge após streak.
    """
    cards = []
    for card in CARDS_BY_MODE[mode]:
        if card == CARD_SHOT and ammo < 1:
            continue
        if card == CARD_DOUBLE_SHOT and (ammo < 2 or double_shots_left <= 0):
            continue
        if card == CARD_COUNTER and ammo < 1:
            continue
        if card == CARD_DODGE and dodge_streak >= MAX_DODGE_STREAK:
            continue
        cards.append(card)
    return cards


def _card_ammo_cost(card: str) -> int:
    """Custo de munição de cada carta."""
    if card in (CARD_SHOT, CARD_COUNTER):
        return -1
    if card == CARD_DOUBLE_SHOT:
        return -2
    return 0


def resolve_cards(p_card: str, o_card: str, p_ammo: int, o_ammo: int) -> Dict:
    """
    Resolve um turno dado as cartas de ambos os jogadores.
    Retorna dict com: p_life_lost, o_life_lost, p_ammo_change, o_ammo_change

    RÉPLICA EXATA da função resolveCards() do TypeScript.
    """
    p_life_lost = 0
    o_life_lost = 0

    # Custo base de munição
    p_ammo_change = _card_ammo_cost(p_card)
    o_ammo_change = _card_ammo_cost(o_card)

    # ══════════════════════════════════════════════════════════════════════
    #  MATRIZ DE RESOLUÇÃO (25 combinações no modo avançado)
    # ══════════════════════════════════════════════════════════════════════

    # ── shot vs ... ─────────────────────────────────────────────────────
    if p_card == CARD_SHOT and o_card == CARD_SHOT:
        p_life_lost = 1; o_life_lost = 1
    elif p_card == CARD_SHOT and o_card == CARD_DOUBLE_SHOT:
        p_life_lost = 2; o_life_lost = 1
    elif p_card == CARD_SHOT and o_card == CARD_DODGE:
        pass  # miss
    elif p_card == CARD_SHOT and o_card == CARD_RELOAD:
        o_life_lost = 1
    elif p_card == CARD_SHOT and o_card == CARD_COUNTER:
        p_life_lost = 1  # counter reflete

    # ── double_shot vs ... ──────────────────────────────────────────────
    elif p_card == CARD_DOUBLE_SHOT and o_card == CARD_SHOT:
        p_life_lost = 1; o_life_lost = 2
    elif p_card == CARD_DOUBLE_SHOT and o_card == CARD_DOUBLE_SHOT:
        p_life_lost = 2; o_life_lost = 2
    elif p_card == CARD_DOUBLE_SHOT and o_card == CARD_DODGE:
        # NOVA REGRA: mesmo se o oponente tentar desviar, ele ainda perde 1 vida
        o_life_lost = 1
    elif p_card == CARD_DOUBLE_SHOT and o_card == CARD_RELOAD:
        o_life_lost = 2
    elif p_card == CARD_DOUBLE_SHOT and o_card == CARD_COUNTER:
        p_life_lost = 1  # counter reflete 1

    # ── dodge vs ... ────────────────────────────────────────────────────
    elif p_card == CARD_DODGE and o_card == CARD_SHOT:
        pass  # desviou
    elif p_card == CARD_DODGE and o_card == CARD_DOUBLE_SHOT:
        # NOVA REGRA: desviar de double_shot causa 1 de dano (não evita ambos)
        p_life_lost = 1
    elif p_card == CARD_DODGE and o_card == CARD_DODGE:
        pass  # nada
    elif p_card == CARD_DODGE and o_card == CARD_RELOAD:
        o_ammo_change += 1  # oponente recarrega (será sobrescrito abaixo)
    elif p_card == CARD_DODGE and o_card == CARD_COUNTER:
        pass  # nada

    # ── reload vs ... ───────────────────────────────────────────────────
    elif p_card == CARD_RELOAD and o_card == CARD_SHOT:
        p_life_lost = 1   # atingido mas recarrega (NOVA REGRA)
    elif p_card == CARD_RELOAD and o_card == CARD_DOUBLE_SHOT:
        p_life_lost = 2   # atingido mas recarrega (NOVA REGRA)
    elif p_card == CARD_RELOAD and o_card == CARD_DODGE:
        p_ammo_change += 1  # será sobrescrito abaixo
    elif p_card == CARD_RELOAD and o_card == CARD_RELOAD:
        p_ammo_change += 1; o_ammo_change += 1  # será sobrescrito abaixo
    elif p_card == CARD_RELOAD and o_card == CARD_COUNTER:
        p_ammo_change += 1  # será sobrescrito abaixo

    # ── counter vs ... ──────────────────────────────────────────────────
    elif p_card == CARD_COUNTER and o_card == CARD_SHOT:
        o_life_lost = 1  # contra-ataque sucesso
    elif p_card == CARD_COUNTER and o_card == CARD_DOUBLE_SHOT:
        o_life_lost = 1  # contra-ataque sucesso (1 dano de volta)
    elif p_card == CARD_COUNTER and o_card == CARD_DODGE:
        pass  # nada
    elif p_card == CARD_COUNTER and o_card == CARD_RELOAD:
        o_ammo_change += 1  # oponente recarrega (será sobrescrito abaixo)
    elif p_card == CARD_COUNTER and o_card == CARD_COUNTER:
        pass  # nada, ambos esperam

    # ══════════════════════════════════════════════════════════════════════
    #  NOVA REGRA: reload SEMPRE concede +1 ammo, mesmo quando interrompido
    # ══════════════════════════════════════════════════════════════════════
    actual_p_ammo_change = (1 if p_ammo < MAX_AMMO else 0) if p_card == CARD_RELOAD else p_ammo_change
    actual_o_ammo_change = (1 if o_ammo < MAX_AMMO else 0) if o_card == CARD_RELOAD else o_ammo_change

    return {
        'p_life_lost': p_life_lost,
        'o_life_lost': o_life_lost,
        'p_ammo_change': actual_p_ammo_change,
        'o_ammo_change': actual_o_ammo_change,
    }


class GameState:
    """Estado completo de um duelo. Usado para simulação."""

    __slots__ = ['p_life', 'p_ammo', 'o_life', 'o_ammo',
                 'turn', 'mode', 'max_life',
                 'last_p_card', 'last_o_card',
                 'p_dodge_streak', 'o_dodge_streak',
                 'p_double_shots_left', 'o_double_shots_left']

    def __init__(self, mode: str):
        self.mode = mode
        self.max_life = LIFE_BY_MODE[mode]
        self.p_life = self.max_life
        self.o_life = self.max_life
        self.p_ammo = 0
        self.o_ammo = 0
        self.turn = 1
        self.last_p_card = 'none'
        self.last_o_card = 'none'
        # Novas variáveis: sequência de esquiva e usos restantes de double_shot
        self.p_dodge_streak = 0
        self.o_dodge_streak = 0
        self.p_double_shots_left = MAX_DOUBLE_SHOT_USES
        self.o_double_shots_left = MAX_DOUBLE_SHOT_USES

    def get_state_key(self, perspective: str = 'player') -> str:
        """Chave de estado para lookup na Q-table.
        Novo formato (sem munição do oponente):
        '{minha_vida}_{minha_ammo}_{opp_vida}_{ultima_carta_opp}_{minha_dodge_streak}_{minha_double_shots_left}'
        """
        if perspective == 'player':
            return f"{self.p_life}_{self.p_ammo}_{self.o_life}_{self.last_o_card}_{self.p_dodge_streak}_{self.p_double_shots_left}"
        else:
            return f"{self.o_life}_{self.o_ammo}_{self.p_life}_{self.last_p_card}_{self.o_dodge_streak}_{self.o_double_shots_left}"

    def get_available_cards(self, perspective: str = 'player') -> List[str]:
        """Cartas disponíveis para a perspectiva dada.
        Considera também o limite de usos de `double_shot` por jogador.
        """
        if perspective == 'player':
            ammo = self.p_ammo
            double_left = self.p_double_shots_left
        else:
            ammo = self.o_ammo
            double_left = self.o_double_shots_left
        return get_available_cards(self.mode, ammo, double_left)

    def apply_turn(self, p_card: str, o_card: str) -> dict:
        """Aplica um turno e retorna o resultado. Modifica o estado in-place."""
        result = resolve_cards(p_card, o_card, self.p_ammo, self.o_ammo)

        self.p_life = max(0, self.p_life - result['p_life_lost'])
        self.o_life = max(0, self.o_life - result['o_life_lost'])
        self.p_ammo = min(MAX_AMMO, max(0, self.p_ammo + result['p_ammo_change']))
        self.o_ammo = min(MAX_AMMO, max(0, self.o_ammo + result['o_ammo_change']))

        # Atualizar dodge streaks
        if p_card == CARD_DODGE:
            self.p_dodge_streak = min(MAX_DODGE_STREAK, self.p_dodge_streak + 1)
        else:
            self.p_dodge_streak = 0

        if o_card == CARD_DODGE:
            self.o_dodge_streak = min(MAX_DODGE_STREAK, self.o_dodge_streak + 1)
        else:
            self.o_dodge_streak = 0

        # Atualizar usos de double_shot
        if p_card == CARD_DOUBLE_SHOT:
            self.p_double_shots_left = max(0, self.p_double_shots_left - 1)
        if o_card == CARD_DOUBLE_SHOT:
            self.o_double_shots_left = max(0, self.o_double_shots_left - 1)

        self.last_p_card = p_card
        self.last_o_card = o_card
        self.turn += 1

        result['game_over'] = self.is_game_over()
        result['winner'] = self.get_winner()
        return result

    def is_game_over(self) -> bool:
        return self.p_life <= 0 or self.o_life <= 0 or self.turn > MAX_TURNS

    def get_winner(self) -> Optional[str]:
        """Retorna 'player', 'opponent', 'draw', ou None."""
        if self.p_life <= 0 and self.o_life <= 0:
            return 'draw'
        if self.p_life <= 0:
            return 'opponent'
        if self.o_life <= 0:
            return 'player'
        if self.turn > MAX_TURNS:
            if self.p_life > self.o_life:
                return 'player'
            elif self.o_life > self.p_life:
                return 'opponent'
            # Empate: resolver por Roleta Russa (1/6 chance por tentativa, alternando)
            import random
            turn = 0
            while True:
                shooter = 'player' if turn % 2 == 0 else 'opponent'
                if random.random() < (1.0 / 6.0):
                    return shooter
                turn += 1
        return None

    def clone(self) -> 'GameState':
        """Cópia profunda do estado."""
        new = GameState.__new__(GameState)
        new.mode = self.mode
        new.max_life = self.max_life
        new.p_life = self.p_life
        new.o_life = self.o_life
        new.p_ammo = self.p_ammo
        new.o_ammo = self.o_ammo
        new.turn = self.turn
        new.last_p_card = self.last_p_card
        new.last_o_card = self.last_o_card
        # Copiar novas variáveis de jogo
        new.p_dodge_streak = getattr(self, 'p_dodge_streak', 0)
        new.o_dodge_streak = getattr(self, 'o_dodge_streak', 0)
        new.p_double_shots_left = getattr(self, 'p_double_shots_left', MAX_DOUBLE_SHOT_USES)
        new.o_double_shots_left = getattr(self, 'o_double_shots_left', MAX_DOUBLE_SHOT_USES)
        return new


def build_payoff_matrix(mode: str) -> Dict:
    """
    Constrói a matriz de payoff para CADA estado possível do jogo.
    Retorna um dicionário indexado por state_key contendo a matriz de resultados
    para cada combinação de cartas.

    Útil para análise exhaustiva de todas as combinações.
    """
    max_life = LIFE_BY_MODE[mode]
    cards = CARDS_BY_MODE[mode]
    last_card_options = ['none'] + cards
    payoff_matrix = {}

    # Novo formato de estado (compatível com Trainer):
    # '{my_life}_{my_ammo}_{opp_life}_{last_card}_{my_dodge}_{my_double_left}'
    for my_life in range(1, max_life + 1):
        for my_ammo in range(0, MAX_AMMO + 1):
            for opp_life in range(1, max_life + 1):
                for my_dodge in range(0, MAX_DODGE_STREAK + 1):
                    for my_double_left in range(0, MAX_DOUBLE_SHOT_USES + 1):
                        for last_card in last_card_options:
                            state_key = f"{my_life}_{my_ammo}_{opp_life}_{last_card}_{my_dodge}_{my_double_left}"

                            my_available = get_available_cards(mode, my_ammo, my_double_left)
                            # Para análise, consideramos o oponente com usos completos (pior-caso)
                            opp_available = get_available_cards(mode, my_ammo, MAX_DOUBLE_SHOT_USES)

                            if not my_available:
                                continue

                            matrix = {}
                            for my_card in my_available:
                                matrix[my_card] = {}
                                for opp_card in opp_available:
                                    # Como o payoff é do ponto de vista do jogador, usamos
                                    # opp_ammo = my_ammo como simplificação analítica.
                                    result = resolve_cards(my_card, opp_card, my_ammo, my_ammo)
                                    net_damage = result['o_life_lost'] - result['p_life_lost']
                                    net_ammo = result['p_ammo_change'] - result['o_ammo_change']
                                    matrix[my_card][opp_card] = {
                                        'my_dmg_taken': result['p_life_lost'],
                                        'opp_dmg_taken': result['o_life_lost'],
                                        'my_ammo_change': result['p_ammo_change'],
                                        'opp_ammo_change': result['o_ammo_change'],
                                        'net_damage': net_damage,
                                        'net_ammo': net_ammo,
                                    }

                            payoff_matrix[state_key] = {
                                'my_cards': my_available,
                                'opp_cards': opp_available,
                                'outcomes': matrix,
                            }

    return payoff_matrix
