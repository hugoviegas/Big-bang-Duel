# Mission System - Análise Completa e Fixes Applied

**Data**: 2026-03-22  
**Status**: ✅ Build Passing | 🔧 Ready for Testing  
**Build Output**: 2225 modules, 1282.03 kB JS, 169.26 kB CSS

---

## Problemas Identificados e Resolvidos

### 1. ❌ Firebase Error: `undefined in completedAt`

**Erro Original**:

```
GameOver.tsx:156 [GameOver] Failed to save match result:
FirebaseError: Function updateDoc() called with invalid data.
Unsupported field value: undefined
(found in field activeMissions.CI19YnSXx33E49T8upD0.completedAt
in document players/9rX4wUCK3sUfHT7TnFHQBHSxXur1)
```

**Causa Raiz**:

- Em `missions.ts:119`: `completedAt: newProgress >= mission.objective.target ? now : undefined`
- Quando missão não completa, `completedAt = undefined`
- Isso era copiado para `updatePayload.activeMissions`
- Firestore rejeita campos com valor `undefined`

**Solução Aplicada**:

1. Modificar `missions.ts` para manter apenas valores válidos
2. Criar `stripUndefinedFromMissions()` em `firebaseService.ts`
3. Aplicar antes de salvar: `updatePayload.activeMissions = stripUndefinedFromMissions(missionEvalResult.updatedMissions)`

**Código Corrigido** (missions.ts lines 124-137):

```typescript
const isNowComplete = newProgress >= mission.objective.target;
const updated: MissionInstance = {
  ...mission,
  progress: newProgress,
  completed: isNowComplete,
  completedAt: isNowComplete ? now : mission.completedAt || undefined,
} as MissionInstance;
```

**Resultado**: ✅ Nenhum campo `undefined` é salvo no Firestore

---

### 2. ❌ Prompt Gemini Muito Genérico

**Problemas**:

- Missões genéricas: "acerte tiros", "desvie"
- Sem explicação clara de COMO fazer
- Usuário não sabe qual carta usar ou estratégia
- Campo "type" não bem definido
- Descrições em inglês/português misturado

**Exemplo de missão ruim**:

```json
{
  "name": "Ace Gunner",
  "description": "Land 10 accurate shots",
  "objective": {
    "type": "unknown",
    "target": 10,
    "metric": "shotsAccuracy"
  }
}
```

**Solução Implementada**:
Novo prompt com 300+ linhas incluindo:

1. **Métricas claras** com nome exato:

   ```
   - shotsAccuracy: Contador de tiros bem-sucedidos na partida
   - doubleShotsAccuracy: Tiros duplos bem-sucedidos
   - dodgesSuccessful: Esquivas bem-sucedidas durante combate
   - countersSuccessful: Contra-ataques bem-sucedidos
   - reloadCount: Número de recargas usadas
   - result:win: Vitórias (alvo sempre 1)
   ```

2. **Template para description**:

   ```
   "achievement: {objetivo final} | how: {como conseguir/qual carta} | rewards: {recompensa}"
   ```

3. **Exemplos Práticos**:

   ```json
   {
     "name": "Escapista do Deserto",
     "description": "achievement: Desviar 10 ataques | how: Foque em timing - clique em dodge quando o inimigo atacar | rewards: +100 ouro",
     "difficulty": "medium",
     "objective": {
       "type": "Defesa",
       "target": 10,
       "metric": "dodgesSuccessful"
     },
     "reward": { "gold": 100, "ruby": 0 }
   }
   ```

4. **Targets Realistas por tipo**:
   - Daily: 5-15 (missões curtas, 1-2 partidas)
   - Weekly: 20-50 (múltiplas partidas)
   - Monthly: 50-150 (longo prazo)

5. **Type Field Variado**: "Ofensiva", "Defesa", "Técnica", "Vitória"

**Resultado**: ✅ Missões explícitas em português com instruções práticas

---

### 3. ❌ Falta de Debug Logging

**Problema**:

- Impossível rastrear qual valor estava sendo buscado
- `checkMissionObjective` retornava 0 silenciosamente
- Sem visibilidade para saber se métrica estava sendo detectada corretamente

**Solução Aplicada**:
Adicionado logging detalhado em 3 funções:

**a) `checkMissionObjective()` (missions.ts)**:

```typescript
const debugLog = (found: number) => {
  console.log(
    `[checkMissionObjective] Mission "${mission.name}" | Metric: ${metric} | Found: ${found} | Target: ${mission.objective.target}`
  );
  return found;
};
// Aplicado em cada case do switch
return debugLog(readSummaryNumber(["successfulShots", ...]));
```

**Output Esperado**:

```
[checkMissionObjective] Mission "Precisão de Elite" | Metric: shotsAccuracy | Found: 12 | Target: 15
[checkMissionObjective] Mission "Escapista do Deserto" | Metric: dodgesSuccessful | Found: 0 | Target: 10
```

**b) `evaluateMissionsProgress()` (missions.ts)**:

```typescript
console.log(
  `[evaluateMissionsProgress] Evaluating ${Object.keys(activeMissions).length} missions`,
);
// ...
console.log(
  `[evaluateMissionsProgress] Results - Completed: ${completedMissions.length}, Progressed: ${progressedMissions.length}`,
);
```

**c) `claimMissionRewardFromSubcollection()` (missions.ts)**:

```typescript
console.log(
  `[claimMissionRewardFromSubcollection] Starting claim for mission: ${missionDocId}`,
);
console.log(`[claimMissionRewardFromSubcollection] Mission data:`, mission);
console.log(
  `[claimMissionRewardFromSubcollection] Claiming reward - Gold: +${mission.reward.gold}, Ruby: +${mission.reward.ruby}`,
);
```

**Resultado**: ✅ Visibilidade completa do fluxo de avaliação e claim

---

## Arquivos Modificados

| Arquivo                           | Linhas          | Mudanças                                                      |
| --------------------------------- | --------------- | ------------------------------------------------------------- |
| `src/lib/missions.ts`             | 18-137, 220-280 | Corrigido `completedAt`, adicionado logging                   |
| `src/lib/firebaseService.ts`      | 95-115, 912-930 | Adicionada `stripUndefinedFromMissions()`, aplicada ao salvar |
| `src/pages/AdminMissionsPage.tsx` | 74-220          | Novo prompt detalhado com exemplos                            |

---

## Guia de Teste Passo-a-Passo

### Pré-requisitos

- ✅ Build compilou sem erros
- ✅ Firebase emulador OU project real configurado
- ✅ Browser com DevTools (F12)

### Teste 1: Geração de Missões

1. **Abrir Console** (F12)
   - Aba "Console"
   - Limpar logs anteriores (ctrl+L)

2. **Ir para Admin → Missões**
   - URL: `http://localhost:5173/admin/missions` (ou variante)

3. **Clicar "Gerar Missões Diárias"**
   - Aguardar resposta da Gemini (5-10s)
   - **Verificar**:
     - Nenhum erro de API
     - JSON retornado é válido
     - `name` em português
     - `description` contém "achievement:" e "how:"
     - `metric` é um dos listados (não genérico)

4. **Verificar no Firestore**
   - Console Firebase → Firestore
   - Caminhar para `missions/daily/templates/`
   - **Validar**: Documentos com estrutura correta

### Teste 2: Atribuição de Missões

1. **Clicar "Atribuir Missões Diárias"**
   - Deve mostrar: "Missões atribuídas com sucesso"

2. **Verificar no Firestore**
   - Ir para `players/{meuUID}/missions/`
   - **Validar**:
     - 3 documentos (ou count configurado)
     - Cada tem: `name`, `description`, `progress: 0`, `completed: false`, `claimed: false`
     - `expiresAt` = agora + 48h

### Teste 3: Progresso em Partida

1. **Jogar uma partida (rápida, contra IA)**
   - Preferir modo que maximize a métrica desejada
   - Ex: Se missão é "shotsAccuracy", fazer muitos shots

2. **Após fim da partida**
   - **Verificar Console**:
     ```
     [checkMissionObjective] Mission "..." | Metric: shotsAccuracy | Found: 8 | Target: 10
     [evaluateMissionsProgress] Evaluating 3 missions
     [evaluateMissionsProgress] Results - Completed: 0, Progressed: 1
     [recordMatchResult] Cleaned activeMissions: {...}
     ```

3. **Ir para /missions page**
   - **Validar**:
     - Barra de progresso está em motion
     - Progresso incrementou (ex: 0/10 → 8/10)
     - Botão de "Coletar recompensa" NÃO apareceu (ainda não completa)

### Teste 4: Completar Missão

1. **Jogar outra(s) partida(s)**
   - Até que missão atinja 10/10 (ou target)

2. **Volta em /missions**
   - **Validar**:
     - Barra de progresso = 100%
     - Mission card ficou com border verde
     - Botão "Coletar recompensa" apareceu

### Teste 5: Reivindicar Recompensa

1. **Clicar "Coletar recompensa"**

2. **Verificar Console**:

   ```
   [claimMissionRewardFromSubcollection] Starting claim for mission: {docId}
   [claimMissionRewardFromSubcollection] Mission data: {...}
   [claimMissionRewardFromSubcollection] Claiming reward - Gold: +150, Ruby: +1
   [claimMissionRewardFromSubcollection] Claim completed successfully
   ```

3. **Ir para Perfil**
   - Ouro aumentou
   - Rubi aumentou (se houver)

4. **Volta para /missions**
   - Mission card ficou "cinza" (claimed state)
   - Botão de claim desapareceu
   - Mensagem de sucesso foi exibida

### Teste 6: Validação do Firestore

1. **Console → Firestore**
   - `players/{uid}/missions/{missionId}`
   - **Validar**:
     - `claimed: true`
     - `claimedAt: {timestamp}`
     - Sem campo `completedAt: undefined` ❌
     - `completedAt: {timestamp}` ✅ (se completou na partida)

---

## Checklist de Validação ✅/❌

- [ ] Build compila: `npm run build` → 0 errors
- [ ] Admin panel acessa corretamente
- [ ] Gemini retorna JSON válido
- [ ] Missões em português
- [ ] `description` tem "achievement:" e "how:"
- [ ] `metric` é exato (não genérico)
- [ ] Missões atribuídas com `progress: 0`
- [ ] Console mostra `[checkMissionObjective]` logs
- [ ] Progresso incrementa após partida
- [ ] `completedAt` nunca é `undefined` no Firestore
- [ ] Claim funciona sem erro Firestore
- [ ] Ouro/rubi incrementam após claim
- [ ] Mission card transiciona para "claimed"

---

## Próximos Passos

1. ✅ **Hoje**: Testes manuais conforme passo-a-passo acima
2. 🔄 **Se bugs**: Usar console logs para diagnóstico
3. 📝 **Depois**: Automated E2E tests com Playwright
4. 🚀 **Final**: Deploy para produção

---

## Contato/Notas Adicionais

**Se encontrar erro no console**:

1. Copiar mensagem completa
2. Procurar por prefixo: `[checkMissionObjective]`, `[evaluateMissionsProgress]`, `[claimMissionRewardFromSubcollection]`
3. Verificar FirebaseError e mensagem de erro
4. Consultar console logs para contexto

**Métricas Válidas** (atualizar aqui se novo for adicionado):

- `shotsAccuracy`
- `doubleShotsAccuracy`
- `dodgesSuccessful`
- `countersSuccessful`
- `reloadCount`
- `result:win`
- `result:loss`
- `damageDealt`
- `damageTaken`
