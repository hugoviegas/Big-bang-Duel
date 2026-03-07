# Plan: Esconder Munição + Round Cap 50

## Decisões do usuário

- Esconder munição do oponente de **ambos os lados** (jogador não vê ammo do bot, bot não vê ammo do jogador)
- Round cap: 50 rounds → quem tiver mais vida ganha
- Requer re-treinar a IA (nova state key sem oppAmmo)

---

## Novas Regras solicitadas (resumo)

- Round cap: 50 rounds. Ao final, quem tiver mais vida vence.
- Dodge (esquiva) pode ser usado no máximo 4 vezes em sequência por jogador; usar qualquer outra carta reseta a sequência.
- No empate por vida após 50 rounds: iniciar tiebreaker "Roleta Russa" — alternar tentativas onde cada tentativa tem 1/6 de chance de acertar; o primeiro que acertar vence. Usaremos temporariamente a animação da carta `reload` como placeholder para a roleta.
- Se um jogador usar `double_shot` e o oponente usar `dodge`, o oponente ainda perde 1 vida (não evita ambos os tiros).
- `double_shot` pode ser usado no máximo 3 vezes por jogador durante a partida.
- Esconder a quantidade exata de munição do inimigo para ambos os lados — jogador NÃO vê o ammo exato do bot e vice-versa.

---

## FASE 1 — Python: Nova state key + MAX_TURNS=50

### Passo 1 — `duelo/training/game_engine.py`

- `get_state_key()` linha 180: remover `{opp_ammo}` → `f"{my_life}_{my_ammo}_{opp_life}_{last_opp_card}"`
- `MAX_TURNS = 70` → `MAX_TURNS = 50` (linha 38)

### Observação importante sobre state key e informações de estado
Com as novas regras precisamos que o agente saiba sobre seu próprio estado de recursos e sequência de esquivas para tomar decisões corretas. Recomendo alterar o formato da chave de estado usada no treinamento para incluir: `my_dodge_streak` e `my_double_shot_remaining` (ou usado), mantendo a política de não incluir `opp_ammo`.

Novo formato sugerido de state key (por perspectiva do agente):
`"{my_life}_{my_ammo}_{opp_life}_{last_opp_card}_{my_dodge_streak}_{my_double_shot_remaining}"`

Isso permite ao agente aprender a gerenciar a sequência de esquivas e o limite de `double_shot` sem ter acesso à munição do oponente.

### Passo 2 — `duelo/training/trainer.py`

- Loop de extração de estratégia (~linha 302): remover `for opp_ammo in range(0, MAX_AMMO + 1):`
- `state_key` linha 307: `f"{my_life}_{my_ammo}_{opp_life}_{opp_ammo}_{last_card}"` → `f"{my_life}_{my_ammo}_{opp_life}_{last_card}"`

### Ajustes adicionais no `trainer.py`
- Incluir nos loops de geração de estados as dimensões `my_dodge_streak` (0..4) e `my_double_shot_remaining` (0..3).
- Atualizar lógica de simulação (`GameState` em `game_engine.py`) para manter e atualizar `dodge_streak` e `double_shot_used` por jogador, e refletir essas variáveis na chave de estado retornada por `get_state_key()`.

### Passo 3 — Re-rodar treinamento

- `cd duelo/training && python run_training.py`
- Copiar novos strategy_*.json para `duelo/public/data/`

### Recomendações de retraining
- Com as novas dimensões de estado, o espaço cresce; contudo, como removemos `opp_ammo`, a combinação resulta em um aumento moderado apenas. Estime ~2–6 horas por modo para convergência dependendo dos episódios escolhidos; ajustar episódios se necessário.

---

## FASE 2 — TypeScript: Atualizar state key na lógica do bot

### Passo 4 — `duelo/src/lib/strategyLoader.ts`

- `getStateKey()`: remover param `oppAmmo`, nova assinatura `(myLife, myAmmo, oppLife, lastOppCard)` → `${myLife}_${myAmmo}_${oppLife}_${lastOppCard || "none"}`
- `getSmartBotCard()`: remover param `playerAmmo` (5° param), atualizar call a `getStateKey()`

### Alterações adicionais TypeScript
- `getStateKey()` deve seguir o novo formato com `my_dodge_streak` e `my_double_shot_remaining` (mas **não** incluir oppAmmo). Nova assinatura: `(myLife, myAmmo, oppLife, lastOppCard, myDodgeStreak, myDoubleShotRemaining)`.
- Atualizar `getSmartBotCard()` e os chamadores (em particular `botChooseCard()` em `src/lib/botAI.ts`) para passar os novos parâmetros.
- `PlayerState` (`src/types/index.ts`) precisa ganhar campos: `dodgeStreak: number` e `doubleShotsLeft: number` (inicialmente 3).
- Atualizar `initialState` em `src/store/gameStore.ts` e a lógica que atualiza o `PlayerState` para incrementar/resetar `dodgeStreak` corretamente e decrementar `doubleShotsLeft` quando `double_shot` é usado.
- Em `getAvailableCards()` (em `gameEngine.ts`) considerar `double_shot` disponibilidade também pelo contador `doubleShotsLeft` (ou filtrar no nível do jogador antes de mostrar/permitir a seleção).

---

## FASE 3 — TypeScript: Esconder ammo do oponente no UI

### Passo 6 — `duelo/src/components/game/StatusBar.tsx`

- Quando `isRight=true` (opponent panel): ammo bullets mostram `?` em vez de filled/empty
- Manter número de bullets (`maxAmmo`) mas pintar todos com cor neutra "desconhecida"

### Notas de UI/UX
- Exibir tooltip ou pequeno texto explicativo: "Munição do oponente desconhecida" para evitar confusão do jogador.
- Para desenvolvimento rápido: pintar bullets com um estilo de "unknown" (cinza) e opcionalmente um `?` overlay; usar a animação de `reload` para a roleta quando necessário.

### Passo 7 — `duelo/src/components/game/WoodenBattleHeader.tsx`

- Painel direito (oponente): ammo bullets com visual de "?" / desconhecido

---

## FASE 4 — TypeScript: Round cap 50

### Passo 8 — `duelo/src/types/index.ts`

- Adicionar `roundLimitReached?: boolean` a `GameState`

### Passo 9 — `duelo/src/store/gameStore.ts`

- Em `resolveTurn()`, após `checkWinner()`: se `!winner && currentState.turn >= 50`:
  - Comparar `newPlayerLife` vs `newOpponentLife`
  - Setar `winnerId` = quem tem mais vida (ou `"draw"` se igual)
  - Setar `roundLimitReached: true` no state
- Passar `roundLimitReached: false` em `initialState`

### Tiebreaker: Roleta Russa (se empate)
- Se empate de vida ao alcançar o round cap, iniciar o tiebreaker de Roleta Russa.
- Implementação: função `startRussianRoulette()` em `gameStore.ts` que alterna entre os jogadores e realiza um teste aleatório de 1/6 por tentativa.
- Cada tentativa: mostrar placeholder de animação (`reload` girando) e efeitos sonoros; se acerto → set `winnerId` e `phase:"game_over"`; se erro → alterna para o outro jogador.
- Registrar estatísticas do desempate em `history` para replays/debug.

---

## Verificação

1. `npm run build` sem erros TypeScript após a Fase 2–4
2. Jogar modo hard → bot não mais esquiva indefinidamente
3. Chegar ao round 50 sem mortes → vencedor correto pelo critério de vida
4. UI do oponente mostra bullets como `?` no UI
5. Verificar que novas strategy files têm state keys sem opp_ammo

---

## Observações finais

- Estas mudanças tocam o engine (Python e TS), o formato das estratégias geradas e o UI. A ordem recomendada de implementação: 1) aplicar mudanças no engine TS (regras, contadores, UI escondida) com stubs para as novas chaves de estratégia; 2) ajustar o `strategyLoader.ts` e `botAI.ts` para o novo state key; 3) atualizar/training Python e re-treinar; 4) substituir `public/data/strategy_*.json` por arquivos treinados e revalidar.
- Posso começar implementando as mudanças TypeScript (regras + UI) enquanto você decide quando rodar o retraining, ou posso aplicar as mudanças no Python e iniciar um re-treino completo. Qual prefere que eu faça primeiro?
