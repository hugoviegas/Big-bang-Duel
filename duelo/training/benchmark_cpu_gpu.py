#!/usr/bin/env python3
"""
Teste de Performance: CPU vs GPU
=================================
Compara tempo de treinamento entre CPU (NumPy) e GPU (CuPy).
Detecta automáticamente se CUDA está disponível.
"""

import subprocess
import sys
import time
import os


def check_gpu_availability():
    """Verificar se CUDA está disponível."""
    print("\n" + "=" * 70)
    print("  TESTE DE GPU")
    print("=" * 70)
    
    # Verificar NVIDIA
    try:
        result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
                                capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            gpu_name = result.stdout.strip()
            print(f"\n✓ GPU NVIDIA DETECTADA: {gpu_name}")
            return True, gpu_name
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    
    print("\n✗ GPU NVIDIA NÃO DETECTADA")
    return False, None


def install_cupy_if_needed(has_gpu, gpu_name):
    """Instala CuPy se houver GPU."""
    if not has_gpu:
        print("\n  GPU não detectada. Pulando instalação de CuPy.")
        return False
    
    print(f"\n  GPU detectada ({gpu_name}). Instalando CuPy...")
    try:
        # Tenta instalar CuPy com CUDA 11.x
        subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '-q', 'cupy-cuda11x'],
            timeout=300
        )
        print("  ✓ CuPy instalado com sucesso!")
        return True
    except Exception as e:
        print(f"  ✗ Erro ao instalar CuPy: {e}")
        print("  Continuando com CPU (NumPy)")
        return False


def run_benchmark(mode: str, episodes: int, script_name: str, label: str):
    """Executa um teste de treinamento e mede tempo."""
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    cmd = [
        sys.executable,
        script_path,
        '--mode', mode,
        '--episodes', str(episodes),
        '--output', f'benchmark_{label}'
    ]
    
    print(f"\n{'─' * 70}")
    print(f"  Teste: {label} ({episodes:,} episódios, modo={mode})")
    print(f"{'─' * 70}")
    
    start = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=None)
        elapsed = time.time() - start
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr[:200])
        
        return elapsed, result.returncode == 0
    except subprocess.TimeoutExpired:
        print("  ✗ Timeout!")
        return None, False


def main():
    print("\n" + "╔" + "=" * 68 + "╗")
    print("║" + " " * 68 + "║")
    print("║" + "  BIG BANG DUEL — BENCHMARK CPU vs GPU ".center(68) + "║")
    print("║" + " " * 68 + "║")
    print("╚" + "=" * 68 + "╝")
    
    # Detectar GPU
    has_gpu, gpu_name = check_gpu_availability()
    
    # Tentar instalar CuPy
    cupy_installed = install_cupy_if_needed(has_gpu, gpu_name)
    
    # Testes
    num_episodes = 50_000  # Teste rápido
    mode = 'beginner'
    
    print("\n" + "=" * 70)
    print("  EXECUTANDO BENCHMARKS")
    print("=" * 70)
    
    # CPU (trainer.py)
    cpu_time, cpu_ok = run_benchmark(mode, num_episodes, 'trainer.py', 'CPU (NumPy)')
    
    # GPU (trainer_gpu.py) — só se houver CuPy
    if cupy_installed:
        gpu_time, gpu_ok = run_benchmark(mode, num_episodes, 'trainer_gpu.py', 'GPU (CuPy)')
        
        print("\n" + "=" * 70)
        print("  RESULTADOS")
        print("=" * 70)
        if cpu_time and gpu_time:
            speedup = cpu_time / gpu_time
            print(f"\n  CPU (NumPy):  {cpu_time:.1f}s")
            print(f"  GPU (CuPy):   {gpu_time:.1f}s")
            print(f"  Speedup:      {speedup:.2f}x")
            
            if speedup > 1:
                print(f"\n  ✓ GPU é {speedup:.2f}x mais rápido!")
            else:
                print(f"\n  ℹ GPU foi mais lento neste teste (overhead de alocação).")
                print(f"    Para treinos maiores, a GPU pode ser mais rápida.")
    else:
        print("\n" + "=" * 70)
        print("  RESULTADOS")
        print("=" * 70)
        if cpu_time:
            print(f"\n  CPU (NumPy):  {cpu_time:.1f}s")
        print(f"\n  CuPy não foi instalado. Apenas CPU foi testado.")
    
    print("\n" + "=" * 70)
    print("  RECOMENDAÇÕES")
    print("=" * 70)
    print("""
  Para treinos completos (2M episódios):
  
  SEM GPU (CPU apenas):
    python run_training.py --modes beginner,normal,advanced --episodes 2000000
  
  COM GPU (CuPy):
    python trainer_gpu.py --mode beginner --episodes 2000000 --output output_beginner
    python trainer_gpu.py --mode normal --episodes 2000000 --output output_normal
    python trainer_gpu.py --mode advanced --episodes 2000000 --output output_advanced
  
  Para paralelização adicional, use 3 terminais simultâneos.
    """)
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
