#!/usr/bin/env python3
"""
Setup GPU — Detecta GPU e instala dependências necessária
===========================================================
Execute isto uma única vez antes de usar trainer_gpu.py
"""

import subprocess
import sys
import platform


def main():
    print("\n" + "=" * 70)
    print("  SETUP GPU PARA BIG BANG DUEL")
    print("=" * 70)
    
    # Verificar sistema operacional
    os_name = platform.system()
    print(f"\n  Sistema: {os_name}")
    
    # Verificar NVIDIA
    print("\n  Verificando GPU NVIDIA...")
    try:
        result = subprocess.run(
            ['nvidia-smi', '-L'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print("  ✓ GPU NVIDIA detectada!")
            gpus = result.stdout.strip().split('\n')
            for gpu in gpus:
                print(f"    - {gpu}")
            
            print("\n  Instalando CuPy...")
            try:
                # Instalar CuPy (auto-detecta CUDA)
                subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '-q', 'cupy'],
                    timeout=300
                )
                print("  ✓ CuPy instalado com sucesso!")
                
                # Verificar importação
                try:
                    import cupy
                    print(f"  ✓ CuPy versão {cupy.__version__} carregado")
                    print(f"  ✓ CUDA disponível: Sim")
                except ImportError as e:
                    print(f"  ✗ Erro ao carregar CuPy: {e}")
                    print("  Fallback para NumPy (CPU)")
                
            except Exception as e:
                print(f"  ✗ Erro ao instalar CuPy: {e}")
                print("  Usando NumPy (CPU)")
        else:
            print("  ✗ GPU NVIDIA não detectada")
            print("  Usando NumPy (CPU)")
    except FileNotFoundError:
        print("  ✗ nvidia-smi não encontrado")
        print("  Usando NumPy (CPU)")
    except Exception as e:
        print(f"  ✗ Erro: {e}")
        print("  Usando NumPy (CPU)")
    
    print("\n" + "=" * 70)
    print("  PRÓXIMAS ETAPAS")
    print("=" * 70)
    print("""
  1. Para rodar um teste rápido de benchmark:
     python benchmark_cpu_gpu.py
  
  2. Para treinar COM GPU (recomendado após GPU setup):
     python trainer_gpu.py --mode beginner --episodes 2000000
  
  3. Para treinar COM CPU (se GPU indisponível):
     python run_training.py --modes beginner --episodes 2000000
    """)
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
