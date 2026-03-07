#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════════════╗
║          BIG BANG DUEL — TREINAMENTO DE IA (Q-Learning)             ║
║                                                                       ║
║  Self-play bot vs bot para descobrir estratégias ótimas.             ║
║  Gera arquivos JSON com estratégias para easy/medium/hard.           ║
║                                                                       ║
║  Uso:                                                                 ║
║    python run_training.py                                             ║
║    python run_training.py --episodes 5000000                          ║
║    python run_training.py --modes beginner,normal                     ║
║    python run_training.py --episodes 1000000 --modes advanced         ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import argparse
import os
import sys
import time
import json
from datetime import datetime

from game_engine import (
    CARDS_BY_MODE, LIFE_BY_MODE, MAX_AMMO, MAX_TURNS,
    build_payoff_matrix, resolve_cards, get_available_cards,
)
from trainer import (
    Trainer, validate_strategies, generate_output_file,
)


def print_banner():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║     🎯  BIG BANG DUEL — AI TRAINING SYSTEM  🎯         ║
    ║                                                          ║
    ║     Q-Learning Self-Play  •  Bot vs Bot                  ║
    ║     Estratégias para: easy / medium / hard               ║
    ╚══════════════════════════════════════════════════════════╝
    """)


def verify_game_engine():
    """Verifica se a engine Python está correta comparando com os testes do TS."""
    print("  Verificando engine de jogo...")

    # Testar todas 25 combinações (do gameEngine.test.ts)
    cards = ['shot', 'double_shot', 'dodge', 'reload', 'counter']

    expected_p_life_lost = {
        'shot':        {'shot': 1, 'double_shot': 2, 'dodge': 0, 'reload': 0, 'counter': 1},
        'double_shot': {'shot': 1, 'double_shot': 2, 'dodge': 0, 'reload': 0, 'counter': 1},
        'dodge':       {'shot': 0, 'double_shot': 0, 'dodge': 0, 'reload': 0, 'counter': 0},
        'reload':      {'shot': 1, 'double_shot': 2, 'dodge': 0, 'reload': 0, 'counter': 0},
        'counter':     {'shot': 0, 'double_shot': 0, 'dodge': 0, 'reload': 0, 'counter': 0},
    }

    expected_o_life_lost = {
        'shot':        {'shot': 1, 'double_shot': 1, 'dodge': 0, 'reload': 1, 'counter': 0},
        'double_shot': {'shot': 2, 'double_shot': 2, 'dodge': 0, 'reload': 2, 'counter': 0},
        'dodge':       {'shot': 0, 'double_shot': 0, 'dodge': 0, 'reload': 0, 'counter': 0},
        'reload':      {'shot': 0, 'double_shot': 0, 'dodge': 0, 'reload': 0, 'counter': 0},
        'counter':     {'shot': 1, 'double_shot': 1, 'dodge': 0, 'reload': 0, 'counter': 0},
    }

    errors = 0
    for p_card in cards:
        for o_card in cards:
            result = resolve_cards(p_card, o_card, 3, 3)
            exp_p = expected_p_life_lost[p_card][o_card]
            exp_o = expected_o_life_lost[p_card][o_card]

            if result['p_life_lost'] != exp_p:
                print(f"    ERRO: {p_card} vs {o_card} — "
                      f"p_life_lost={result['p_life_lost']}, esperado={exp_p}")
                errors += 1
            if result['o_life_lost'] != exp_o:
                print(f"    ERRO: {p_card} vs {o_card} — "
                      f"o_life_lost={result['o_life_lost']}, esperado={exp_o}")
                errors += 1

    # Testar regra de reload (NOVA REGRA: reload sempre dá ammo)
    r1 = resolve_cards('reload', 'shot', 0, 1)
    assert r1['p_ammo_change'] == 1, f"reload vs shot: p_ammo_change={r1['p_ammo_change']}, esperado=1"
    assert r1['o_ammo_change'] == -1, f"reload vs shot: o_ammo_change={r1['o_ammo_change']}, esperado=-1"

    r2 = resolve_cards('reload', 'dodge', 0, 1)
    assert r2['p_ammo_change'] == 1, f"reload vs dodge: p_ammo_change={r2['p_ammo_change']}, esperado=1"

    r3 = resolve_cards('reload', 'counter', 0, 1)
    assert r3['p_ammo_change'] == 1, f"reload vs counter: p_ammo_change={r3['p_ammo_change']}, esperado=1"
    assert r3['o_ammo_change'] == -1, f"reload vs counter: o_ammo_change={r3['o_ammo_change']}, esperado=-1"

    # Reload no máximo não dá ammo extra
    r4 = resolve_cards('reload', 'dodge', 3, 3)
    assert r4['p_ammo_change'] == 0, f"reload at max: p_ammo_change={r4['p_ammo_change']}, esperado=0"

    if errors == 0:
        print("  ✓ Engine verificada — todas as 25 combinações corretas!")
        print("  ✓ Regra de reload verificada — reload SEMPRE dá munição!")
    else:
        print(f"  ✗ {errors} erros encontrados na engine!")
        sys.exit(1)


def analyze_payoff_matrix(mode: str):
    """Analisa e exibe insights da matriz de payoff para um modo."""
    print(f"\n  Análise exhaustiva — {mode.upper()}")

    cards = CARDS_BY_MODE[mode]
    max_life = LIFE_BY_MODE[mode]

    # Estado inicial (todos começam com 0 ammo)
    print(f"\n  Turno 1 (0 ammo vs 0 ammo):")
    print(f"    Cartas disponíveis: {get_available_cards(mode, 0)}")

    # Tabela de resultados para estado com ammo cheio
    print(f"\n  Matriz de dano puro ({max_life}HP, 3 ammo vs 3 ammo):")
    header = f"    {'':>12} | " + " | ".join(f"{c:>12}" for c in cards)
    print(header)
    print(f"    {'─' * len(header)}")

    for p_card in cards:
        row = f"    {p_card:>12} | "
        for o_card in cards:
            result = resolve_cards(p_card, o_card, 3, 3)
            net = result['o_life_lost'] - result['p_life_lost']
            row += f"{'+'if net>0 else ''}{net:>11} | "
        print(row)

    # Contagem de cartas disponíveis por nível de ammo
    print(f"\n  Cartas disponíveis por munição ({mode}):")
    for ammo in range(MAX_AMMO + 1):
        avail = get_available_cards(mode, ammo)
        print(f"    Ammo {ammo}: {avail}")


def run_exhaustive_analysis(modes: list, output_dir: str):
    """Gera análise exhaustiva da matriz de payoff para cada modo."""
    print("\n" + "═" * 65)
    print("  FASE 0: ANÁLISE EXHAUSTIVA DAS COMBINAÇÕES")
    print("═" * 65)

    for mode in modes:
        analyze_payoff_matrix(mode)

        # Gerar arquivo de payoff matrix
        print(f"\n  Gerando payoff matrix para {mode}...")
        matrix = build_payoff_matrix(mode)
        filepath = os.path.join(output_dir, f'payoff_matrix_{mode}.json')
        os.makedirs(output_dir, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump({
                'mode': mode,
                'total_states': len(matrix),
                'matrix': matrix,
            }, f, ensure_ascii=False, indent=2)
        print(f"  Arquivo: {filepath} ({os.path.getsize(filepath) / 1024:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(
        description='Big Bang Duel — Sistema de Treinamento de IA')
    parser.add_argument('--episodes', type=int, default=2_000_000,
                        help='Número de episódios por modo (default: 2.000.000)')
    parser.add_argument('--modes', type=str, default='beginner,normal,advanced',
                        help='Modos para treinar (default: beginner,normal,advanced)')
    parser.add_argument('--output', type=str, default='output',
                        help='Diretório de saída (default: output)')
    parser.add_argument('--skip-analysis', action='store_true',
                        help='Pular análise exhaustiva de payoff matrix')
    parser.add_argument('--validation-games', type=int, default=10000,
                        help='Jogos de validação por teste (default: 10.000)')
    args = parser.parse_args()

    modes = [m.strip() for m in args.modes.split(',')]
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), args.output)

    print_banner()

    # ─── Fase 0: Verificação da Engine ──────────────────────────────────
    print("═" * 65)
    print("  FASE 0: VERIFICAÇÃO DA ENGINE")
    print("═" * 65)
    verify_game_engine()

    # ─── Fase 0.5: Análise Exhaustiva ──────────────────────────────────
    if not args.skip_analysis:
        run_exhaustive_analysis(modes, output_dir)

    # ─── Fase 1: Treinamento ───────────────────────────────────────────
    total_start = time.time()
    all_results = {}

    for mode in modes:
        # Treinar
        trainer = Trainer(mode, episodes=args.episodes)
        strategies = trainer.train()

        # Validar
        validation = validate_strategies(strategies, mode,
                                          num_games=args.validation_games)

        # Gerar arquivo de saída
        generate_output_file(mode, strategies, validation,
                              args.episodes, output_dir)

        all_results[mode] = {
            'validation': validation,
            'strategies_count': {
                diff: len(strats) for diff, strats in strategies.items()
            }
        }

    # ─── Resumo Final ──────────────────────────────────────────────────
    total_time = time.time() - total_start

    print(f"\n{'═' * 65}")
    print(f"  RESUMO FINAL")
    print(f"{'═' * 65}")
    print(f"  Tempo total: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"  Episódios por modo: {args.episodes:,}")
    print(f"  Modos treinados: {modes}")
    print(f"  Diretório de saída: {output_dir}")
    print()

    for mode, data in all_results.items():
        v = data['validation']
        hard_wr = v.get('hard_vs_random', {}).get('win_rate', 0)
        med_wr = v.get('medium_vs_random', {}).get('win_rate', 0)
        easy_wr = v.get('easy_vs_random', {}).get('win_rate', 0)
        print(f"  {mode:>10}: hard={hard_wr:.1f}% | medium={med_wr:.1f}% | "
              f"easy={easy_wr:.1f}% (vs random)")

    print()

    # Gerar resumo JSON
    summary = {
        'training_date': datetime.now().isoformat(),
        'total_time_seconds': round(total_time, 2),
        'episodes_per_mode': args.episodes,
        'modes': modes,
        'results': all_results,
    }
    summary_path = os.path.join(output_dir, 'training_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"  Resumo salvo em: {summary_path}")

    print(f"\n  Arquivos de estratégia gerados em: {output_dir}/")
    print(f"  Copie strategy_*.json para duelo/public/data/ para uso no jogo.")
    print()


if __name__ == '__main__':
    main()
