import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseRoom } from "../../hooks/useFirebase";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { normalizeUnlocks } from "../../lib/progression";

import type { AttackTimer, GameMode, Room, RoomConfig } from "../../types";

type LobbyTab = "custom" | "public";

const MODES = [
  { id: "beginner" as GameMode, name: "INICIANTE" },
  { id: "normal" as GameMode, name: "NORMAL" },
  { id: "advanced" as GameMode, name: "AVANCADO" },
];

const TIMER_OPTIONS: { value: AttackTimer; label: string }[] = [
  { value: 2, label: "2s" },
  { value: 3, label: "3s" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 30, label: "30s" },
];

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-gold" : "bg-sand/20 border border-sand/20"}`}
      aria-label={label}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${checked ? "right-0.5 bg-black/80" : "left-0.5 bg-sand/50"}`}
      />
    </button>
  );
}

export function OnlineLobby() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const unlocks = normalizeUnlocks(user?.unlocks);

  const { createRoom, joinRoom, getPublicRooms, getUserRooms } =
    useFirebaseRoom();

  const [activeTab, setActiveTab] = useState<LobbyTab>("custom");

  // Custom room states
  const [selectedMode, setSelectedMode] = useState<GameMode>("normal");
  const [isPublic, setIsPublic] = useState(false);
  const [attackTimer, setAttackTimer] = useState<AttackTimer>(10);
  const [bestOf3, setBestOf3] = useState(false);
  const [hideOpponentAmmo, setHideOpponentAmmo] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [customError, setCustomError] = useState("");
  const [hasActiveRoom, setHasActiveRoom] = useState(false);

  // Public rooms states
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);

  const selectedCharacter = useMemo(() => {
    const avatar = user?.avatar ?? "marshal";
    if (unlocks.charactersUnlocked.includes(avatar)) {
      return avatar;
    }
    return unlocks.charactersUnlocked[0] ?? "marshal";
  }, [unlocks.charactersUnlocked, user?.avatar]);

  const launchIntoRoom = (
    roomId: string,
    mode: GameMode,
    roomConfig: RoomConfig,
    asHost: boolean,
  ) => {
    useGameStore
      .getState()
      .initializeGame(
        mode,
        true,
        asHost,
        roomId,
        selectedCharacter,
        roomConfig,
        user?.displayName,
        user?.avatarPicture,
      );
    navigate(`/game/${roomId}`);
  };

  const refreshCustomState = async () => {
    const myRooms = await getUserRooms();
    setHasActiveRoom(myRooms.length > 0);
  };

  const loadPublicRooms = async () => {
    setLoadingPublicRooms(true);
    try {
      const rooms = await getPublicRooms();
      setPublicRooms(rooms);
    } finally {
      setLoadingPublicRooms(false);
    }
  };

  useEffect(() => {
    if (activeTab === "custom") {
      refreshCustomState();
      return;
    }

    loadPublicRooms();
    // Intencional: troca de aba deve disparar o carregamento dessa aba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateCustom = async () => {
    setCustomError("");
    if (hasActiveRoom) {
      setCustomError("Voce ja possui uma sala ativa.");
      return;
    }

    const config: RoomConfig = {
      isPublic,
      attackTimer,
      bestOf3,
      hideOpponentAmmo,
    };

    const roomId = await createRoom(
      selectedMode,
      config,
      selectedCharacter,
      user?.avatarPicture,
    );
    if (!roomId) {
      setCustomError("Nao foi possivel criar a sala.");
      return;
    }

    launchIntoRoom(roomId, selectedMode, config, true);
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError("");

    if (joinCode.length !== 6) {
      setCustomError("Codigo deve ter 6 caracteres.");
      return;
    }

    const room = await joinRoom(
      joinCode.toUpperCase(),
      selectedCharacter,
      user?.avatarPicture,
    );
    if (!room) {
      setCustomError("Sala nao encontrada ou cheia.");
      return;
    }

    launchIntoRoom(
      room.id,
      room.mode,
      {
        attackTimer: room.config?.attackTimer ?? 10,
        bestOf3: room.config?.bestOf3 ?? false,
        isPublic: room.config?.isPublic ?? false,
        hideOpponentAmmo: room.config?.hideOpponentAmmo ?? false,
      },
      false,
    );
  };

  const handleJoinPublic = async (room: Room) => {
    const joined = await joinRoom(
      room.id,
      selectedCharacter,
      user?.avatarPicture,
    );
    if (!joined) {
      setCustomError("Sala publica indisponivel.");
      return;
    }

    launchIntoRoom(
      room.id,
      room.mode,
      {
        attackTimer: room.config?.attackTimer ?? 10,
        bestOf3: room.config?.bestOf3 ?? false,
        isPublic: true,
        hideOpponentAmmo: room.config?.hideOpponentAmmo ?? false,
      },
      false,
    );
  };

  return (
    <div className="w-full px-4 py-6 space-y-4">
      <h1 className="font-western text-4xl text-gold text-center text-glow-gold animate-drop-bounce">
        SALAO ONLINE
      </h1>

      <div className="flex rounded-xl overflow-hidden border border-sand/20">
        <button
          onClick={() => setActiveTab("custom")}
          className={`flex-1 py-2.5 font-western text-[10px] tracking-widest uppercase transition-all ${
            activeTab === "custom"
              ? "bg-red-900/30 text-red-300"
              : "bg-black/40 text-sand/50 hover:bg-black/60"
          }`}
        >
          Criar Sala
        </button>
        <button
          onClick={() => setActiveTab("public")}
          className={`flex-1 py-2.5 font-western text-[10px] tracking-widest uppercase transition-all border-l border-sand/20 ${
            activeTab === "public"
              ? "bg-sky-900/40 text-sky-300"
              : "bg-black/40 text-sand/50 hover:bg-black/60"
          }`}
        >
          Salas Publicas
        </button>
      </div>

      {activeTab === "custom" && (
        <div className="card-wood p-4 space-y-4 animate-fade-up">
          <h2 className="font-western text-lg text-gold text-center tracking-widest">
            CRIAR SALA PERSONALIZADA
          </h2>

          <div>
            <p className="font-stats text-[10px] uppercase text-sand/60 mb-2">
              Modo
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`py-2 rounded-lg border text-[10px] font-western ${
                    selectedMode === mode.id
                      ? "border-gold bg-gold/20 text-gold"
                      : "border-sand/20 text-sand/60"
                  }`}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="font-stats text-[10px] uppercase text-sand/60">
                Sala Publica
              </p>
              <Toggle
                checked={isPublic}
                onChange={setIsPublic}
                label="Sala publica"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="font-stats text-[10px] uppercase text-sand/60">
                Melhor de 3
              </p>
              <Toggle checked={bestOf3} onChange={setBestOf3} label="MD3" />
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="font-stats text-[10px] uppercase text-sand/60">
                Ocultar municao
              </p>
              <Toggle
                checked={hideOpponentAmmo}
                onChange={setHideOpponentAmmo}
                label="Ocultar municao"
              />
            </div>

            <div>
              <p className="font-stats text-[10px] uppercase text-sand/60 mb-2">
                Tempo de ataque
              </p>
              <div className="flex gap-1.5">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAttackTimer(opt.value)}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-stats ${
                      attackTimer === opt.value
                        ? "border-orange-400 bg-orange-900/40 text-orange-300"
                        : "border-sand/20 bg-black/20 text-sand/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {customError && (
            <p className="font-stats text-[10px] uppercase text-red-300 text-center">
              {customError}
            </p>
          )}

          <button onClick={handleCreateCustom} className="btn-western w-full">
            CRIAR SALA
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-sand/20" />
            <span className="font-stats text-[9px] uppercase text-sand/50">
              ou
            </span>
            <div className="flex-1 h-px bg-sand/20" />
          </div>

          <form onSubmit={handleJoinByCode} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="CODIGO"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="input-parchment text-center text-lg font-western uppercase tracking-[0.3em]"
            />
            <button type="submit" className="btn-western btn-sky w-full">
              ENTRAR POR CODIGO
            </button>
          </form>
        </div>
      )}

      {activeTab === "public" && (
        <div className="card-wood p-4 min-h-[320px] animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-western text-sm text-sky-300 tracking-widest">
              SALAS PUBLICAS
            </h2>
            <button
              onClick={loadPublicRooms}
              className="font-stats text-[9px] uppercase text-sand/50 hover:text-sand"
            >
              Atualizar
            </button>
          </div>

          {loadingPublicRooms ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-3 opacity-60">
              <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
              <span className="font-western text-xs text-sand">
                PROCURANDO...
              </span>
            </div>
          ) : publicRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] opacity-40 text-center">
              <span className="font-western text-xs text-sand px-6">
                Nenhuma sala publica disponivel no momento.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {publicRooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-black/40 border border-sky-500/20 rounded-xl p-3 flex justify-between items-center"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-western text-sky-300 tracking-widest text-base">
                      {room.id}
                    </span>
                    <span className="text-[10px] text-sand/50 font-stats uppercase">
                      {room.hostName} - {room.mode}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(room)}
                    className="bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 px-4 py-1.5 rounded font-western text-[10px] text-sky-300 tracking-widest"
                  >
                    ENTRAR
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
