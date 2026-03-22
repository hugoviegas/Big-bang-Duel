# Plan: Quest System com Geração IA Diária/Semanal/Mensal

## TL;DR

Implementar um sistema completo de missões que:

## Status Atual (2026-03-22)

- ✅ Geração de missões funcionando via API direta Gemini (sem Cloud Functions).
- ✅ Persistência em Firestore funcionando para templates e atribuição ao jogador.
- ✅ Prompt atualizado para gerar name/description em português do Brasil.
- ✅ Fase 6 iniciada: página real de missões implementada em /missions com abas, progresso e resgate.
- ✅ Modal de missões removido do topo; acesso agora é pela rota dedicada.
- 🔄 Correção estrutural de progresso em andamento: avaliação agora usa a subcoleção players/{uid}/missions como fonte de verdade e sincroniza activeMissions no perfil.
- 🔄 Próximo foco: validação em jogo real (partida -> progresso -> concluir -> resgatar).

- Gera **3 tipos de missões** (diárias, semanais, mensais) via IA Gemini (Firebase AI Logic)
- Rastreia progresso via **métricas de partida expandidas** (shots, dodges, counters, etc.)
- Distribui **3 missões de cada tipo** por jogador, com expiração e acúmulo até 4
- Fornece **admin panel** para ajustes manuais
- Integra-se com **UI existente** (padrão "bolinha" para marcadores)

**Abordagem recomendada**:

1. Expandir `MatchSummary` com todas as métricas necessárias
2. Criar estrutura Firestore: `missions/{periodType}/` com cópias em `players/{uid}/missions/`
3. Cloud Functions para orquestração: Daily (6 missões), Weekly (10 missões), Monthly (8 missões)
4. Avaliação contínua: ao finalizar partida, verificar progresso vs missões ativas
5. Admin panel web para revisão/ajuste
6. UI para exibir, rastrear e reivindicar recompensas

---

## Steps

### **Fase 1: Análise & Expansão de Métricas (2-3 dias)**

1. **Expandir `MatchSummary` type** ([duelo/src/types/index.ts])
   - Adicionar campos necessários:
     - `shotsAccuracy`: atiradores bem-sucedidos esta partida
     - `doubleShots`: tiros duplos usados + acertos
     - `dodgesSuccessful`: desvios bem-sucedidos
     - `countersSuccessful`: contra-golpes bem-sucedidos
     - `reloadCount`: quantas vezes recarregou
     - `classUsed`: classe do personagem
     - `consecutiveWins`: se for vitória, incrementar streak
     - `totalTime`: duração em segundos
     - `mode`: "solo" | "online"
     - **Novo**: `cardUsageBreakdown` (objeto com contagem per card: {shot, double_shot, reload, dodge, counter})

2. **Atualizar `saveMatchResult()` em [duelo/src/lib/firebaseService.ts]**
   - Calcular campos expandidos a partir do histórico de turnos (`history[]`)
   - Exemplo: iterar `TurnResult[]` para contar acertos vs uso de cartas
   - Verificar se dodge/counter/shot foram bem-sucedidos (baseado em dano recebido 0)

3. **Adicionar função helper em [duelo/src/lib/gameEngine.ts]**
   - `calculateMatchMetrics(turns: TurnResult[], playerIndex: number): MatchMetrics`
   - Retorna breakdown completo: acertos por carta, desvios bem-sucedidos, etc.

4. **Testes**:
   - Jogar 5 partidas (solo + online) e validar que `MatchSummary` captura todos os campos
   - Verificar que valores fazem sentido (ex: shots accuracy ≤ shots usados)

---

### **Fase 2: Estrutura Firestore & Types (2 dias)**

5. **Define Mission types** ([duelo/src/types/index.ts])
   - `MissionCategory`: "daily" | "weekly" | "monthly"
   - `MissionDifficulty`: "easy" | "medium" | "hard" | "hard_prolonged"
   - `MissionReward`: { gold: number (50-1000), ruby?: number (0-5) }
   - `MissionTemplate`: { id, name, description, category, difficulty, objective, reward, updatedAt }
   - `MissionInstance`: extends MissionTemplate + { uid, assignedAt, expiresAt, progress, completed, completedAt, claimed }
   - `MissionObjective`: { type, target, metric }
     - Exemplos:
       - `{ type: "shots_per_match", target: 3, metric: "shotsAccuracy" }`
       - `{ type: "dodges_total", target: 2, metric: "dodgesSuccessful" }`
       - `{ type: "online_wins", target: 5, metric: "result:win" }`

6. **Create Firestore collections** (via Firebase Console ou seeded em dataconnect)
   - `missions/daily/{missionId}` → MissionTemplate[]
   - `missions/weekly/{missionId}` → MissionTemplate[]
   - `missions/monthly/{missionId}` → MissionTemplate[]
   - `players/{uid}/missions/{missionId}` → MissionInstance[]
   - `missions/generationLog/{timestamp}` → { periodType, count, timestamp, geminiUsed, status }

7. **Update `PlayerProfile` type** ([duelo/src/types/index.ts])
   - Adicionar: `activeMissions?: { [missionId: string]: MissionInstance }`
   - Adicionar: `claimedMissions?: string[]` (lista de missionIds reivindicadas)
   - Adicionar: `missionStats?: { dailyCompleted, weeklyCompleted, monthlyCompleted }`

---

### **Fase 3: AI Generation Logic (Cloud Functions) (3 dias)**

8. **Create Cloud Function: `generateDailyMissions`**
   - Trigger: Cloud Scheduler (diariamente às 00:00 UTC ou horário local)
   - Payload: `{ periodType: "daily", count: 6 }`
   - Lógica:
     - Chamar Firebase AI Logic / Gemini com prompt estruturado:
       ```
       Generate 6 DAILY missions for a card game.
       Constraints:
       - Difficulty: easy or medium only
       - Multiple of 50 coins reward (50-300)
       - Examples: "Land 3 shots in one match", "Dodge 2 shots", "Play 2 matches"
       - Variety: include shots, dodges, counters, reloads, classes, streaks, online plays
       Return JSON: [{ name, description, difficulty, target, metric, reward }]
       ```
     - Validar resposta (sanitize, verificar formato)
     - Salvar templates em `missions/daily/{newId}`
     - Logar em `missions/generationLog`

9. **Create Cloud Function: `generateWeeklyMissions`**
   - Trigger: Cloud Scheduler (todo domingo 00:00)
   - Count: 10 missões
   - Difficulty: medium or hard
   - Reward: 150-500 coins (múltiplos de 50)

10. **Create Cloud Function: `generateMonthlyMissions`**
    - Trigger: Cloud Scheduler (1º do mês 00:00)
    - Count: 8 missões
    - Difficulty: hard or hard_prolonged
    - Reward: 300-1000 coins + 1-5 rubies
    - Exemplos: "Land 50 shots cumulative", "Win 10 straight solo matches"

11. **Create Cloud Function: `assignMissionsToPlayer`** (Callable)
    - Trigger: After mission generation OR on first login after new missions
    - Lógica:
      - Query `players/{uid}` para contar missões ativas (dailies < 4, etc.)
      - Pick 3 aleatórias do template mais recente para cada tipo
      - Salvar em `players/{uid}/missions/` com `assignedAt`, `expiresAt` (48h pra daily, 7 dias pra weekly, 30 pra monthly)
      - Atualizar `PlayerProfile.activeMissions`

---

### **Fase 4: Progresso & Avaliação (3 dias)**

12. **Create function `evaluateMissionsProgress()`** ([duelo/src/lib/missions.ts] - NEW FILE)
    - Input: `uid, recentMatchSummary`
    - Lógica:
      - Fetch `players/{uid}/missions/` (active only)
      - Para cada missão ativa:
        - Checar se `expiresAt` passou → liberar, resetar progress
        - Comparar `matchSummary.[metric]` contra `objective.target`
        - Se cumpriu: marcar como `completed: true, completedAt: timestamp`
        - Log: { missionId, progress, status } para debugging
    - Retorna: { completedMissions[], progressedMissions[] }

13. **Integrate into match finish flow** ([duelo/src/lib/firebaseService.ts])
    - Após `saveMatchResult()`, chamar `evaluateMissionsProgress(uid, matchSummary)`
    - Atualizar Firestore batch com resultado

14. **Create function `claimMissionReward()`** (Callable)
    - Input: `uid, missionId`
    - Validar: missão completed, não claimed, existe
    - Adicionar reward ao `profile.currencies`
    - Marcar como `claimed: true, claimedAt: timestamp`
    - Add to `claimedMissions[]`

15. **Cleanup function `expireMissions()`** (Cloud Scheduler nightly)
    - Query todas as missões ativas com `expiresAt < now`
    - Marcar como `expired: true` (não deletar, manter histórico)
    - Remover de `activeMissions`

---

### **Fase 5: Admin Panel (3-4 dias)**

16. **Create Admin types** ([duelo/src/types/index.ts])
    - `AdminPermission`: "view_missions" | "create_missions" | "edit_missions" | "regenerate"
    - Update `PlayerProfile` com: `role?: "admin" | "user"` + `adminPermissions?: AdminPermission[]`

17. **Create Admin pages** (Nova pasta: [duelo/src/components/admin/])
    - `AdminMissionsPage.tsx` — Dashboard com abas:
      - **Viewer**: listar, filtrar por tipo/dificuldade, export JSON
      - **Editor**: form para criar/editar missão manual
      - **Generator**: botão "Regenerate Now" + log de últimas gerações
      - **Player Missions**: search jogador, ver missões ativas + histórico
    - `MissionForm.tsx` — formulário com validation
    - `MissionList.tsx` — tabela sortável

18. **Create Admin routes** ([duelo/src/App.tsx])
    - `/admin/missions` — Dashboard (protegido por role check)
    - Guard: `useAdminProtection()` hook para verificar role

19. **Create Admin Callable Functions**:
    - `createMissionManual`: { template, periodType } → salva em `missions/{periodType}/{id}`
    - `editMission`: { missionId, updates }
    - `regenerateMissionsNow`: { periodType } → force Cloud Function run
    - `reassignPlayerMissions`: { uid } → limpar e reatribuir

---

### **Fase 6: UI/Frontend - Missions Page (4 dias)** _Parallel com Fase 5_

20. **Create Missions Page components** ([duelo/src/pages/MissionsPage.tsx] - NEW)
    - Layout: 3 tabs (Daily | Weekly | Monthly)
    - Cada tab mostra:
      - **Ativo**: lista de 3 missões com:
        - Bolinha verde (completada) / cinza (incomplete)
        - Nome, descrição
        - Progress bar (ex: 3/5 acertos)
        - "Reivindicar" botão (se completed)
        - Tempo de expiração (em vermelho se <2h)
      - **Histórico**: missões completadas/expiradas (filtro)

21. **Create Mission Card component** ([duelo/src/components/game/MissionCard.tsx] - NEW)
    - Props: `mission: MissionInstance, onClaim: () => void`
    - Mostra: ícone dificuldade, progresso circular, botão reivindicar
    - Estilo: seguindo design system existente (cores, fonts, animations)

22. **Bottom nav update** ([duelo/src/components/layout/BottomNav.tsx])
    - Já existe link `/missions` — apenas confirmar routing
    - Adicionar badge com "número de missões completadas" (como achievement indicator)

23. **Store update** ([duelo/src/store/authStore.ts])
    - Adicionar computed: `activeMissionsCount()`, `completedMissionCount()`
    - Adicionar action: `claimMissionReward(missionId)` que chama Callable

24. **Real-time subscriptions** ([duelo/src/hooks/useMissions.ts] - NEW HOOK)
    - `useMissions()` — Subscribe to `players/{uid}/missions/` updates
    - Auto-update UI quando progresso mudar

---

### **Fase 7: Testes (3-4 dias)**

25. **Unit Tests** ([duelo/src/lib/missions.test.ts] - NEW)
    - Teste `calculateMatchMetrics()`:
      - 5 partidas com variações (shots, dodges, counters)
      - Validar breakdown está correto
    - Teste `evaluateMissionsProgress()`:
      - Mock match summary
      - Verificar que completa corretamente
      - Verificar que expires corretamente

26. **Cloud Function Tests** (novo arquivo em `functions/tests/`)
    - Mock Gemini API response
    - Validar que `generateDailyMissions()` retorna 6 válidas
    - Validar que `assignMissionsToPlayer()` respeita limite (max 4 ativas)
    - Validar expiration logic

27. **E2E Tests** ([duelo/e2e/missions.spec.ts] - NEW)
    - Cenário 1: Jogar partida solo → completar missão → reivindicar recompensa
    - Cenário 2: Rejeitar assignação de 4ª missão (limite)
    - Cenário 3: Admin cria missão manual → aparece na lista
    - Cenário 4: Missão expira após 48h

---

### **Fase 8: Verificação & Deploy (2 dias)**

28. **Pre-deploy checklist**:
    - [ ] Todas as métricas rastreadas em MatchSummary
    - [ ] Firestore rules atualizadas para `missions/` + `players/{uid}/missions/`
    - [ ] Cloud Functions deployadas + testadas
    - [ ] Admin panel acessível apenas com role
    - [ ] UI responde em real-time
    - [ ] Rewards corretos (moedas múltiplo 50, rubies 0-5)

29. **Verification steps** (após deploy):
    - [ ] Gerar missões manualmente (admin trigger)
    - [ ] Jogar 5 partidas variadas, validar que progresso rastreia
    - [ ] Aguardar/simular expiração (48h) — ver missão expirar
    - [ ] Reivindicar 3 recompensas — validar saldo atualiza
    - [ ] Verificar admin log de gerações

---

## Relevant files

- `duelo/src/types/index.ts` — Expandir MissionTemplate, MissionInstance, PlayerProfile
- `duelo/src/lib/firebaseService.ts` — updateDoc match result, atualizar para incluir progresso
- `duelo/src/lib/gameEngine.ts` — NEW function calculateMatchMetrics()
- `duelo/src/lib/missions.ts` — NEW arquivo com evaluateMissionsProgress(), claimMissionReward()
- `duelo/firestore.rules` — ADD rules para missions/_ + players/{uid}/missions/_
- `functions/src/missions.ts` — NEW Cloud Functions (generate daily/weekly/monthly, assign, cleanup)
- `duelo/src/pages/MissionsPage.tsx` — NEW página principal
- `duelo/src/components/game/MissionCard.tsx` — NEW componente de missão
- `duelo/src/components/admin/AdminMissionsPage.tsx` — NEW admin dashboard
- `duelo/src/hooks/useMissions.ts` — NEW hook real-time
- `duelo/e2e/missions.spec.ts` — NEW teste e2e

---

## Verification

1. **Prototipagem** (Dia 1):
   - Criar tipos + estrutura Firestore manualmente
   - Testar que MatchSummary captura dados (via console logs)
   - ✅ Validar estrutura antes de Cloud Functions

2. **Após Fase 3 (Gemini)**:
   - Rodar manualmente `generateDailyMissions()`
   - Verificar que retorna JSON válido, formatado
   - Visualizar em Firestore Console

3. **Após Fase 4 (Progresso)**:
   - Jogar 1 partida
   - Verificar que `MatchSummary` foi criado
   - Chamar `evaluateMissionsProgress()` no console Firestore
   - Ver que missão marca como "completed" em tempo real

4. **Após Fase 6 (UI)**:
   - Navegar para `/missions`
   - Já deve mostrar 3 missões ativas com bolinha/progresso
   - Reivindicar 1 recompensa, validar moedas aumentam

5. **Teste completo**:
   - Rodar E2E sob Playwright
   - Verificar que fluxo end-to-end funciona

---

## Decisions

- **Storage**: Templates globais + instâncias por jogador (permite tracking de histórico + variação futura)
- **Gemini**: Firebase AI Logic inicialmente; fallback para axios se instável
- **Admin**: Role-based simples (campo "admin" em profile)
- **Reward**: Sempre múltiplo 50 coins (50-1000); rubies apenas em hard+ (1-5)
- **Expiration**: 48h dailies, 7d weeklies, 30d monthlies
- **Max ativas**: 4 por tipo (pode fazer até 3 \* 3 = 9 simultâneas)
- **Métricas**: Expandir MatchSummary com breakdown per card + successfulDodges, consecutiveWins, etc.

---

## Further Considerations

1. **Balanceamento da dificuldade IA**: Após primeira semana, analisar completion rate → ajustar Gemini prompt se muito easy/hard.
2. **Eventos temáticos**: Depois, adicionar "seasonal missions" que mudam a cada 2 semanas (não no MVP).
3. **Trading de missões**: Future: permitir player pedir miss nova se rejeitar (custa moeda) — escopo não é MVP.
