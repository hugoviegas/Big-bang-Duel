# Phase 2: Database Sync Fix - Complete Checklist

## 🔴 CRITICAL ACTION REQUIRED

Você precisa publicar as novas rules no Firebase Console para que a sincronização de estado funcione completamente.

---

## ✅ Changes Made Locally (COMPLETED)

### 1. **gameStore.ts** - State Persistence ✓

- ✅ Added `SavedSoloMatch` interface with all required fields
- ✅ Added `_persistSoloState()` for localStorage saves (solo games only)
- ✅ Added `getSavedSoloMatch()` / `clearSavedSoloMatch()` exports
- ✅ Enhanced `resolveTurn()` with 6 new RTDB fields per player:
  - `hostDodgeStreak`, `guestDodgeStreak` (0-3)
  - `hostDoubleShotsLeft`, `guestDoubleShotsLeft` (0-2)
  - `hostShieldUsesLeft`, `guestShieldUsesLeft` (0-2)
- ✅ Enhanced `syncFromFirebase()` to read these fields from RTDB
- ✅ Enhanced `nextRound()` with proper state reset
- ✅ Added `restoreSoloMatch()` method
- ✅ TypeScript errors: 0

### 2. **menu.tsx** - Resume/Reconnect Banners ✓

- ✅ Added detect / resume solo matches banner (amber)
- ✅ Added detect / reconnect online rooms banner (sky-blue)
- ✅ Handler functions: `handleResumeSolo`, `handleReconnectOnline`
- ✅ TypeScript errors: 0

### 3. **GameArena.tsx** - Online Recovery ✓

- ✅ Fixed `checkAndJoin` useEffect to read room mode/role correctly
- ✅ Reads RTDB room data on mount and initializes with actual mode/avatar
- ✅ Determines if user is host or guest from `room.hostId`

### 4. **realtime.rules.json** - RTDB Rules Updated ✓

- ✅ Added explicit validation for 6 new state fields
- ✅ Validation ranges:
  - DodgeStreak: 0-3
  - DoubleShotsLeft: 0-2
  - ShieldUsesLeft: 0-2
- ✅ Validates life (0-10), ammo (0-3), stars (0-3)
- ✅ Validates choice fields (string or null)
- ✅ Validates names and avatars (strings or null)

### 5. **firestore.rules** - Profile Rules Updated ✓

- ✅ Split `write` into `create` and `update` for better control
- ✅ Profile creation now requires `uid` and `displayName` fields
- ✅ Friends subcollection rules unchanged (working)

### 6. **useFirebase.ts** - Initialization Fixed ✓

- ✅ `createRoom()` now initializes all 6 state fields to defaults
- ✅ `joinRoom()` now ensures state fields are initialized for guest
- ✅ Prevents undefined values that might fail RTDB validation

---

## 🚀 ACTION ITEMS - Deploy to Firebase

### Step 1: Publish RTDB Rules

```
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: "Big-bang-Duel"
3. Navigate to: Realtime Database → Rules
4. Copy content from: duelo/realtime.rules.json
5. Paste into the Rules editor
6. Click "Publish" button
7. Wait for confirmation ✓
```

### Step 2: Publish Firestore Rules

```
1. Firebase Console → Firestore Database → Rules
2. Copy content from: duelo/firestore.rules
3. Paste into the Rules editor
4. Click "Publish" button
5. Wait for confirmation ✓
```

### Step 3: Verify Deployment

```
1. Check Firebase Console shows "Rules updated" message
2. Rules version numbers should be visible
3. No error messages in the console
```

---

## 🧪 Testing After Deployment

### Solo Game Test

```
1. Click "Jogo Solo"
2. Play until end of round
3. Reload page (F5)
4. Check if "PARTIDA EM ANDAMENTO" banner appears
5. Click "CONTINUAR" button
6. Game should restore to exact state
✓ If successful: Solo persistence works
```

### Online Game Test

```
1. Create a room (Host)
2. Join from another browser (Guest)
3. Play one round
4. Host closes browser/tab
5. Host reconnects with same room code
6. Check GameArena loads with correct mode/role
✓ If successful: Online sync + reconnect works
```

### State Field Sync Test

```
1. Create online match
2. Play until dodge streak is visible (dodge shield/counter)
3. Guest closes and rejoins
4. Check dodge streak persists in guest's view
5. Repeat for double-shots left, shield uses
✓ If successful: All state fields sync properly
```

---

## 🛠️ Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause**: Rules not published or user not authenticated
**Fix**:

1. Confirm rules published in Firebase Console
2. Check user is authenticated: `authStore.user !== null`
3. Check room hostId matches authenticated user.uid

### Error: "Validation failed"

**Cause**: Data doesn't match RTDB rules schema
**Fix**: Verify in console logs that all fields match expected types/ranges

### State Not Persisting on Reload

**Cause**: localStorage key is wrong or quota exceeded
**Fix**:

1. Open DevTools → Application → Local Storage
2. Look for key: `bbd_active_solo_match`
3. Check value is valid JSON
4. If missing: solo persist not being called

### Cannot Join Room After Refresh

**Cause**: Room data missing from RTDB or user not authorized
**Fix**:

1. Check room exists in Firebase Realtime Database
2. Verify user.uid appears in hostId or guestId
3. Check room.status is not "finished"

---

## 📝 Summary of Database Structure

### RTDB Room Schema (rooms/{roomId})

```json
{
  "id": "ABC123",
  "hostId": "uid123",
  "guestId": "uid456",
  "hostName": "Player1",
  "guestName": "Player2",
  "hostAvatar": "marshal",
  "guestAvatar": "skull",
  "mode": "normal",
  "status": "in_progress",
  "turn": 1,
  "currentRound": 1,

  // Life & Ammo
  "hostLife": 4,
  "guestLife": 3,
  "hostAmmo": 1,
  "guestAmmo": 2,

  // NEW: Phase 2 State Persistence
  "hostDodgeStreak": 0,
  "guestDodgeStreak": 1,
  "hostDoubleShotsLeft": 2,
  "guestDoubleShotsLeft": 1,
  "hostShieldUsesLeft": 2,
  "guestShieldUsesLeft": 1,

  // Choices
  "hostChoice": "shot",
  "guestChoice": "dodge",

  // Scoring
  "hostStars": 1,
  "guestStars": 0,

  // Config
  "config": {
    "attackTimer": 10,
    "bestOf3": false,
    "hideOpponentAmmo": true
  },

  // Timestamps
  "createdAt": 1710000000000
}
```

### Firestore profiles/{uid} Schema

```json
{
  "uid": "uid123",
  "displayName": "Player1",
  "avatar": "marshal",
  "level": 1,
  ...other fields
}
```

---

## ✨ What This Fixes

| Issue                 | Before                         | After                              |
| --------------------- | ------------------------------ | ---------------------------------- |
| Solo game reload      | ❌ State lost                  | ✅ Restored from localStorage      |
| Online partial state  | ❌ Missing dodgeStreak/shields | ✅ All 9 state fields synced       |
| Online reconnect      | ❌ Mode hardcoded to "normal"  | ✅ Reads actual mode from RTDB     |
| Player role confusion | ❌ Always guest on reconnect   | ✅ Correctly determines host/guest |
| Database validation   | ❌ Missing rules               | ✅ Complete schema validation      |

---

## 🎯 Next Steps After Publishing Rules

1. **Build & Deploy Frontend**

   ```bash
   cd duelo
   npm run build
   # Then deploy dist/ to hosting
   ```

2. **Manual Testing**
   - Test solo game restore
   - Test online room sync
   - Test reconnect flow
   - Check console for sync errors

3. **Monitor Production**
   - Check Firebase Console for rule violations
   - Monitor player reports
   - Check browser console for sync errors

---

**Status**: Ready for database deployment ✓
**Last Updated**: $(date)
**Branch**: feat/ai-history5-double2
