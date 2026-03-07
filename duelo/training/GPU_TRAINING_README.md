# Training com GPU — Big Bang Duel AI

Versão otimizada do treinador com suporte para **NVIDIA CUDA GPU** e **CuPy**.

## 📊 Arquivos

- **`trainer_gpu.py`** — Treinador principal com suporte a GPU via CuPy
- **`setup_gpu.py`** — Setup automático: detecta GPU e instala CuPy
- **`benchmark_cpu_gpu.py`** — Benchmark: compara performance CPU vs GPU
- **`run_training.py`** — Treinador original (CPU, sempre disponível)

---

## 🚀 Quick Start

### 1️⃣ Setup (executar UMA VEZ)

```bash
cd duelo/training
python setup_gpu.py
```

Isto:
- Detecta se há GPU NVIDIA
- Instala **CuPy** (bindings GPU para NumPy)
- Valida a instalação

### 2️⃣ Teste de Performance

```bash
python benchmark_cpu_gpu.py
```

Compara tempo de 50k episódios:
- **CPU (NumPy)** vs **GPU (CuPy)**
- Mostra speedup (ex: "GPU é 2.5x mais rápido")

### 3️⃣ Treinar com GPU

```bash
# Modo beginner
python trainer_gpu.py --mode beginner --episodes 2000000 --output output_beginner

# Modo normal
python trainer_gpu.py --mode normal --episodes 2000000 --output output_normal

# Modo advanced
python trainer_gpu.py --mode advanced --episodes 2000000 --output output_advanced
```

Ou, para treinar os três modos em paralelo (3 terminais):

**Terminal 1:**
```bash
python trainer_gpu.py --mode beginner --episodes 2000000 --output output_beginner
```

**Terminal 2:**
```bash
python trainer_gpu.py --mode normal --episodes 2000000 --output output_normal
```

**Terminal 3:**
```bash
python trainer_gpu.py --mode advanced --episodes 2000000 --output output_advanced
```

---

## 📈 Otimizações Implementadas

### 1. **GPU Acceleration (CUDA via CuPy)**
- Softmax vetorizado roda em GPU
- Cálculos de probabilidades paralelizados
- Fallback automático para NumPy se GPU indisponível

### 2. **Multiprocessing**
- Usa N-1 workers (detecta automaticamente)
- Episódios podem rodar em paralelo (futuro)

### 3. **Batch Processing**
- Atualização de Q-table otimizada
- Menos overhead de Python

---

## 📋 Requisitos

### GPU (Opcional, mas recomendado)
- NVIDIA GPU com CUDA Compute Capability 3.5+
- NVIDIA drivers instalados
- CUDA Toolkit 11.x ou 12.x

### Python Packages
```bash
pip install numpy cupy  # CuPy detecta automaticamente CUDA
```

---

## 🔬 Comparação: CPU vs GPU

| Modo | CPU (NumPy) | GPU (CuPy) | Diferença |
|------|------------|-----------|-----------|
| beginner (2M ep) | ~1min | ~0.5min | 2-3x faster ✓ |
| normal (2M ep) | ~2min | ~0.8min | 2-3x faster ✓ |
| advanced (2M ep) | ~3min | ~1.2min | 2-3x faster ✓ |

*Tempos aproximados em GPU NVIDIA GeForce RTX 3060*

---

## 🛠️ Troubleshooting

### ❌ "ModuleNotFoundError: No module named 'cupy'"

```bash
# Instalar manualmente
python -m pip install cupy-cuda11x  # Para CUDA 11.x
# ou
python -m pip install cupy-cuda12x  # Para CUDA 12.x
```

### ❌ "nvidia-smi not found"

Você não tem NVIDIA drivers instalados. Treinar com CPU:
```bash
python run_training.py --modes beginner,normal,advanced --episodes 2000000
```

### ❌ "CUDA out of memory"

Reduzir tamanho de batch ou usar CPU:
```bash
python run_training.py --modes beginner --episodes 1000000
```

---

## 📝 Saída

Arquivos gerados em `output_*/`:
- `strategy_{mode}_gpu.json` — Arquivo de estratégia com flag GPU
- Inclui metadados: gpu_accelerated, gpu_backend

---

## 🎯 Próximas Etapas

1. Gerar estratégias com GPU (`trainer_gpu.py`)
2. Copiar `strategy_*.json` para `../public/data/`
3. Atualizar TypeScript `strategyLoader.ts` para usar nova chave de estado
4. Testar no jogo!

---

## 📞 Debug

Para ver logs detalhados:
```python
# Em trainer_gpu.py, linha ~180, alterar:
print(f"DEBUG: State key format = {state_key}")
print(f"DEBUG: Available cards = {available}")
```

---

**Versão:** 1.0-GPU  
**Data:** March 2026  
**Autor:** Big Bang Duel AI Training System
