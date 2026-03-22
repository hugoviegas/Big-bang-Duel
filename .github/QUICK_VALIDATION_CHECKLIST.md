# ⚡ Quick Start - Validação de Missões (5 minutos)

## 🔧 TL;DR - O que foi corrigido

✅ **Firebase Error**: Campo `undefined` em `completedAt` → Agora strips undefined antes de salvar  
✅ **Qualidade Gemini**: Missões genéricas → Agora explícitas em português com exemplos  
✅ **Debug Logging**: Sem visibilidade → Console mostra cada passo ([checkMissionObjective], [evaluateMissionsProgress], etc)

---

## ⚙️ Validação Rápida (Antes de Testar Full Flow)

### 1. Verificar Build ✅

```bash
cd duelo
npm run build
# Esperado: ✓ built in ~13s (0 errors)
```

### 2. Verificar Console Spy

Abrir DevTools (F12) → Console  
Ver que pode ver logs com prefixo `[`

### 3. Admin Panel Works

- Navegar para `/admin/missions`
- Clicar "Gerar Missões Diárias"
- Validar resposta do Gemini apareceu em JSON válido

---

## 🎮 Full Flow Test (10 minutos)

### Passo 1: Gerar e Atribuir Missões

```
1. Admin → Gerar Missões Diárias → OK
2. Admin → Atribuir Missões Diárias → OK
3. Firestore: players/{uid}/missions/ tem 3 docs ✓
```

### Passo 2: Jogar Partida

```
1. Solo mode vs IA (rápido)
2. DevTools Console aberto
3. Ao terminar partida:
   - Deve aparecer logs:
     [checkMissionObjective] Mission "X" | Metric: Y | Found: Z | Target: T
     [evaluateMissionsProgress] Evaluating 3 missions
     [evaluateMissionsProgress] Results - Completed: 0, Progressed: 1 (ou similar)
```

### Passo 3: Verificar Progresso

```
1. Ir para /missions page
2. Ver que barra de progresso incrementou
3. Exemplo: 0/10 → 8/10
```

### Passo 4: Completar Missão

```
1. Jogar até 100% (ex: partida 2 para atingir 10/10)
2. Ir para /missions
3. Ver botão "Coletar recompensa" em verde
```

### Passo 5: Reivindicar Recompensa

```
1. Clicar "Coletar recompensa"
2. Console deve mostrar:
   [claimMissionRewardFromSubcollection] Claim completed successfully
3. Ir para Perfil → Ouro/Rubi incrementou ✓
4. Firestore: mission.claimed = true ✓
```

---

## 🚨 Se der erro, checklist de debug

### Erro: "Missing or insufficient permissions"

```
Causa: Firestore rules não está permitindo
Solução:
- Publicar firestore.rules no Firebase Console
- Verificar que uid está correto
- Ver logs em Console
```

### Erro: "Mission not found" ao reivindicar

```
Causa: Mission document não está na subcollection
Solução:
- Ir para Firestore: players/{uid}/missions/
- Validar que documento existe com claim = false
- Se não, reatribuir missões
```

### Console mostra "Found: 0" para {metric}

```
Causa: MatchSummary não tem esse campo
Solução:
- Verificar se MatchSummary tem o campo (ex: successfulShots)
- Adicionar se faltando em firebaseService.ts recordMatchResult()
- Match summary construction é linha ~725-760
```

### FirebaseError: "undefined in {fieldName}"

```
Causa: stripUndefinedFromMissions não foi aplicada
Solução:
- Verificar firebaseService.ts linha 920
- Garantir que updatePayload.activeMissions é resultado de stripUndefinedFromMissions()
- Recompilар: npm run build
```

---

## 📊 Tabela de Resultados Esperados

| Teste            | Esperado                                | Sinal de Sucesso ✓                  |
| ---------------- | --------------------------------------- | ----------------------------------- |
| Gerar Missões    | JSON COM "achievement:" na description  | Console sem erro, resposta válida   |
| Atribuir Missões | 3 docs em players/{uid}/missions/       | Firestore mostra docs               |
| Jogar Partida    | Logs de [checkMissionObjective]         | Console mostra Found: X (não 0)     |
| Progresso        | Barra incrementa                        | /missions mostra 8/10 (ou similar)  |
| Completar        | Botão "Coletar" aparece em verde        | UI muda para state "ready to claim" |
| Claim            | Claim completed successfully no console | Ouro/Rubi incrementa no Perfil      |

---

## 📞 Contato se tiver dúvida

Ver documentos completos:

- `MISSION_SYSTEM_COMPLETE_ANALYSIS.md` - Análise técnica completa (30 min read)
- `MISSION_FIX_REPORT.md` - Teste passo-a-passo detalhado (20 min read)

Logs esperados no console durante validação:

```
[checkMissionObjective] Mission "..." | Metric: ... | Found: ... | Target: ...
[evaluateMissionsProgress] Evaluating X missions
[evaluateMissionsProgress] Results - Completed: X, Progressed: X
[recordMatchResult] Cleaned activeMissions: {...}
[claimMissionRewardFromSubcollection] Mission data: {...}
[claimMissionRewardFromSubcollection] Claim completed successfully
```

---

✅ **Status**: Ready for Testing
📅 **Estimated Testing Time**: 20-30 minutos (full flow com múltiplas partidas)
🎯 **Next**: Deploy após validação positiva
