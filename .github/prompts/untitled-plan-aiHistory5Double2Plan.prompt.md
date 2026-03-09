---
## **Plan: AI Intelligence + Game State Persistence Overhaul**

**TL;DR**: Melhorar IA com reward shaping para penalizar movimentos irracionais (dodge no início, reload contra oponente agressivo) + persistência completa (Firestore + localStorage) para recuperação automática offline e online.

### **Approach**

A IA inteligente vai aprender através de **reward shaping** no treinamento:
- **Penalidade early-game dodge**: `-3.0` se desviar antes do turn 3 (aprende a posicionar melhor)
- **Penalidade ammo-aware reload**: `-1.0` se oponente tem padrão agressivo (shots/counters) nos últimos 3 cards
- A IA aprenderá **implicitamente** a estimar munição via o histórico de 5 turnos (bucket 0-15), sem precisar de contador explícito

Para persistência, usaremos **dual-save**:
- **localStorage**: Acesso instantâneo, offline, salva automaticamente após cada turno
- **Firestore**: Sincronização em nuvem, recovery cross-device, histórico completo

---

### **Steps**

#### **PHASE 1: AI Intelligence (Primary — Steps 1-8)**

| #   | Task                                    | Duration | Dependencies                |
| --- | --------------------------------------- | -------- | --------------------------- |
| 1.1 | Enhance trainer_v3.py reward function   | 30 min   | None                        |
| 1.2 | Verify history bucket captures patterns | 15 min   | 1.1                         |
| 1.3 | Review game_engine.py constants         | 10 min   | 1.2                         |
| 1.4 | Smoke test: 10k beginner episodes       | 20 min   | 1.3                         |
| 1.5 | Add console.log debug in botAI.ts       | 20 min   | 1.4 (parallel)              |
| 1.6 | Update strategyLoader.ts for v4.0       | 40 min   | 1.5                         |
| 1.7 | Full training: 2M all 3 modes           | 120 min  | 1.6 (parallel: 3 terminals) |
| 1.8 | Deploy strategies + npm build           | 10 min   | 1.7                         |

**Key Changes:**

- [trainer_v3.py lines 278-305]: Add `-3.0` dodge penalty (turn ≤ 3), `-1.0` reload penalty (opp aggressive)
- [botAI.ts ~line 100]: Log `[AI Decision]` with card, source, historyBucket, strategyProbs (hard difficulty only)
- [strategyLoader.ts lines 103-115]: Replace lastCard+prevCard with single historyBucket (0-15)
- New function in both files: `compute_history_bucket(history: int[]) → int` (copies from trainer)

---

#### **PHASE 2: Game State Persistence (In Parallel with Phase 1 — Steps 9-16)**

| #   | Task                                 | Duration | Dependencies |
| --- | ------------------------------------ | -------- | ------------ |
| 2.1 | Design Firestore schema              | 20 min   | None         |
| 2.2 | Design localStorage structure        | 20 min   | 2.1          |
| 2.3 | Extend Firebase Realtime rules       | 15 min   | 2.2          |
| 2.4 | Implement persistence in gameStore   | 60 min   | 2.3          |
| 2.5 | Add auto-recovery UI in GameArena    | 40 min   | 2.4          |
| 2.6 | Implement deterministic replay logic | 45 min   | 2.5          |
| 2.7 | Auto-reconnect for online games      | 50 min   | 2.6          |
| 2.8 | Validate game state function         | 30 min   | 2.7          |

**Key Changes:**

- [gameStore.ts]: Add `persistGameState()`, `_saveToLocalStorage()`, `_saveToFirestore()`, `replayToTurn()`
- [GameArena.tsx ~line 38]: Check localStorage on mount, show "Resume Game?" modal
- [OnlineLobby.tsx]: Auto-reconnect banner + exponential backoff (3s interval, timeout 10 min)
- New Firebase collection: `matches/{matchId}` with history + snapshots (every 5 turns)

**Data Structure Examples:**

```json
// localStorage: bbd_game_abc123
{
  "matchId": "abc123",
  "mode": "normal",
  "playerState": { "life": 3, "ammo": 2, "dodgeStreak": 0, "doubleShotsLeft": 2 },
  "opponentState": { "life": 4, "ammo": 1, "dodgeStreak": 1, "doubleShotsLeft": 2 },
  "history": [ TurnResult[], TurnResult[], ... ],
  "currentTurn": 15,
  "lastUpdated": 1710000000,
  "status": "in_progress"
}

// Firestore: matches/{matchId}/snapshots/at_turn_10
{
  "turn": 10,
  "playerLife": 3,
  "opponentLife": 4,
  "playerAmmo": 2,
  "opponentAmmo": 1,
  "timestamp": 1710000000
}
```

---

#### **PHASE 3: Testing & Deployment (Steps 17-21)**

| #   | Test               | Success Criteria                                                                  |
| --- | ------------------ | --------------------------------------------------------------------------------- |
| 3.1 | Unit tests         | Bucket function works, replay matches original, persistence structure valid       |
| 3.2 | Offline recovery   | Play 5+ turns → Reload → "Resume?" appears → Continue exact state                 |
| 3.3 | Online multiplayer | Host+Guest play 3 turns → Guest disconnect/reconnect → Auto-continue with history |
| 3.4 | Performance        | localStorage write <50ms, Firestore read <500ms, replay <1s for 50 turns          |
| 3.5 | Edge cases         | Draw games, char abilities, corrupted data all handled gracefully                 |

---

### **Relevant Files**

- `duelo/training/trainer_v3.py` — Q-Learning reward shaping hub
- `duelo/src/lib/botAI.ts` — AI decision logging
- `duelo/src/lib/strategyLoader.ts` — State key v4.0 + bucket
- `duelo/src/store/gameStore.ts` — Persistence (local + Firebase)
- `duelo/src/components/game/GameArena.tsx` — Auto-recovery UI
- `duelo/src/components/lobby/OnlineLobby.tsx` — Reconnection logic
- `duelo/public/data/strategy_{mode}.json` — Deployed v3 strategies
- `duelo/realtime.rules.json` — Firebase Realtime rules
- `duelo/firestore.rules` — Firestore rules (if used)

---

### **Verification Checklist**

✅ **AI Intelligence Smoke Test**:

- Train 10k beginner episodes → 60-75% win rate vs random
- Console shows decreasing dodge frequency in turns 1-3
- State coverage reaches 70%+

✅ **Full AI Training** (after approval):

- 2M episodes all 3 modes (parallel, ~40 min each)
- Hard mode: 75-92% win rate, 80%+ state coverage
- Deploy JSONs to `public/data/` → `npm run build` passes

✅ **Offline Recovery**:

- Play 5+ turns → Reload page → "Resume Game?" appears with timestamp/turn #
- Click "Resume" → Game continues from exact turn
- localStorage persists even after browser close

✅ **Online Multiplayer Recovery**:

- Host + Guest both join room → Play 3 turns
- Guest disconnects (simulate via DevTools network offline)
- Guest reconnects within 5 min → Game auto-continues with full history
- Round wins (best-of-3) persist across disconnect

✅ **Edge Cases**:

- Game ends in draw → Offline recovery works
- Character abilities trigger during replay → Match stored TurnResult
- Corrupted localStorage → App doesn't crash, offers fresh game

---

### **Key Decisions**

| Decision                  | Choice                                | Rationale                                                          |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| **Ammo Learning**         | Pure Q-Learning (no explicit counter) | Simpler, learns implicitly from 5-turn history pattern recognition |
| **Offline + Online Save** | Dual: Firestore + localStorage        | Cloud backup + instant offline access                              |
| **Reconnection**          | Automatic (auto-continue)             | Better UX than button click                                        |
| **Replay Speed**          | Instant (no animation)                | Faster resume, show summary instead of replaying 200+ turns        |
| **State Snapshots**       | Every 5 turns                         | Balances storage vs negligible replay overhead                     |
| **Debug Logging**         | Hard difficulty only                  | Prevents spam on easy/medium, focuses debugging                    |
| **RNG in Replay**         | Not needed                            | All outcomes stored in TurnResult, fully deterministic             |

---

### **Timeline Estimate**

- **Phase 1 (AI)**: ~4-5 hours active work + 2 hours passive training
- **Phase 2 (Persistence)**: ~4-5 hours parallel with Phase 1
- **Phase 3 (Testing)**: ~3-4 hours

**Total**: ~11-14 hours development + 2 hours training = ~13-16 wall-clock hours (can parallelize phases)

---

### **Further Considerations (To Decide)**

1. **Should AI adjust difficulty dynamically based on win rate?**
   - **Recommended**: No (keep static beginner/normal/hard) — simpler, easier to debug; add ELO later

2. **Should replay animation be instant or real-time?**
   - **Recommended**: Instant — faster, less annoying; show summary overlay instead

3. **How long before expired room auto-deletes from Firestore?**
   - **Recommended**: 14 days — matches localStorage TTL, balances UX + storage

---

**Ready to proceed?** This plan provides:
✓ Specific file paths + line numbers for implementation  
✓ Data structures for persistence  
✓ Clear phase dependencies (no blockers)  
✓ Measurable success criteria  
✓ Edge cases identified

Would you like me to start with **Phase 1 (AI Improvements)**, or do you have questions about the approach?
