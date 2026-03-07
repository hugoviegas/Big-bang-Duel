# Big Bang Duel — AI Training System

Sistema de treinamento de IA por **Q-Learning self-play** (bot vs bot).  
Gera arquivos de estratégia JSON que o jogo carrega para tornar o bot inteligente.

## Resultados do Treinamento (2M episódios)

| Modo     | Hard vs Random | Medium vs Random | Easy vs Random | Hard vs Easy |
|----------|---------------|-----------------|---------------|-------------|
| Beginner | **92.9%** win  | **82.8%** win    | 25.6% win     | 94.0% win   |
| Normal   | **98.6%** win  | **92.8%** win    | 31.7% win     | 99.4% win   |
| Advanced | **98.1%** win  | **90.8%** win    | 35.8% win     | 99.6% win   |

## Como Rodar

```bash
cd duelo/training

# Instalar dependências
pip install -r requirements.txt

# Treino completo (3 modos, ~2h)
python run_training.py

# Treino rápido para teste (~30s)
python run_training.py --episodes 50000 --modes beginner

# Customizar episódios e modos
python run_training.py --episodes 5000000 --modes beginner,normal,advanced
```

## Arquivos Gerados

```
training/output/
├── strategy_beginner.json      # Estratégias para modo iniciante (98 KB)
├── strategy_normal.json        # Estratégias para modo normal (259 KB)
├── strategy_advanced.json      # Estratégias para modo avançado (367 KB)
├── strategy_*_debug.json       # Versões formatadas para leitura
├── payoff_matrix_*.json        # Análise exhaustiva de todas as combinações
└── training_summary.json       # Resumo com métricas de validação
```

## Formato do Arquivo de Estratégia

```json
{
  "meta": {
    "mode": "beginner",
    "max_life": 3,
    "max_ammo": 3,
    "cards": ["reload", "shot", "dodge"],
    "state_format": "{my_life}_{my_ammo}_{opp_life}_{opp_ammo}_{last_opp_card}"
  },
  "strategies": {
    "hard": {
      "3_0_3_0_none": { "reload": 0.85, "dodge": 0.15 },
      "3_1_3_0_reload": { "shot": 0.6, "dodge": 0.3, "reload": 0.1 }
    },
    "medium": { ... },
    "easy": { ... }
  }
}
```

**State key**: `{minha_vida}_{minha_ammo}_{vida_opp}_{ammo_opp}_{ultima_carta_opp}`

## Integração com o Jogo

Os arquivos são automaticamente carregados pelo jogo em `src/lib/strategyLoader.ts`.

1. Copiar estratégias para `duelo/public/data/`
2. O `App.tsx` chama `loadStrategies()` no startup
3. O `botAI.ts` usa as estratégias com fallback para lógica original

## Arquitetura

```
game_engine.py     → Réplica EXATA da engine TypeScript (gameEngine.ts)
trainer.py         → Q-Learning dual + geração de estratégias + validação  
run_training.py    → Entry point com CLI, verificação automática da engine
```

### Q-Learning
- **Agentes duais**: Dois agentes treinam jogando entre si
- **Estado**: (vida, ammo, vida_opp, ammo_opp, última_carta_opp)
- **Recompensa**: +100 vitória, -100 derrota, +5 por dano causado, -0.3 por turno
- **30% random start**: Alguns episódios começam de estados aleatórios para cobrir estados raros
- **Decay**: Epsilon 0.4→0.02, Alpha 0.15→0.01

### Dificuldades
- **Hard**: Softmax com temperatura baixa (0.3) — quase ótimo
- **Medium**: Softmax com temperatura média (1.5) — balanceado
- **Easy**: Softmax inverso + uniforme — prefere jogadas subótimas
