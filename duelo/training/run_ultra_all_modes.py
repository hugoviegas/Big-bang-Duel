#!/usr/bin/env python3
"""
Run Ultra trainer for all modes in parallel.

This script launches one process per mode and splits available CPU workers
across them to avoid oversubscription.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from multiprocessing import cpu_count


def split_workers(total_workers: int, n: int) -> list[int]:
    base = total_workers // n
    rem = total_workers % n
    return [base + (1 if i < rem else 0) for i in range(n)]


def main() -> int:
    parser = argparse.ArgumentParser(description='Run ultra training for beginner/normal/advanced in parallel')
    parser.add_argument('--episodes', type=int, default=2_000_000)
    parser.add_argument('--validation-games', type=int, default=2000)
    parser.add_argument('--skip-validation', action='store_true')
    parser.add_argument('--total-workers', type=int, default=max(3, cpu_count() - 1))
    parser.add_argument('--output-prefix', type=str, default='output_ultra')
    args = parser.parse_args()

    modes = ['beginner', 'normal', 'advanced']
    worker_split = split_workers(max(3, args.total_workers), len(modes))

    print(f"Launching parallel all-modes training")
    print(f"episodes per mode: {args.episodes:,}")
    print(f"total workers budget: {args.total_workers}")
    print(f"worker split: {dict(zip(modes, worker_split))}")

    script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'trainer_ultra.py')

    procs: list[tuple[str, subprocess.Popen]] = []
    for mode, workers in zip(modes, worker_split):
        cmd = [
            sys.executable,
            script_path,
            '--mode', mode,
            '--episodes', str(args.episodes),
            '--workers', str(max(1, workers)),
            '--validation-games', str(args.validation_games),
            '--output', f"{args.output_prefix}_{mode}",
        ]
        if args.skip_validation:
            cmd.append('--skip-validation')

        print(f"[{mode}] {' '.join(cmd)}")
        p = subprocess.Popen(cmd)
        procs.append((mode, p))

    status = 0
    start = time.time()
    for mode, p in procs:
        code = p.wait()
        print(f"[{mode}] exit code: {code}")
        if code != 0:
            status = code

    print(f"Total wall time: {time.time() - start:.1f}s")
    return status


if __name__ == '__main__':
    raise SystemExit(main())
