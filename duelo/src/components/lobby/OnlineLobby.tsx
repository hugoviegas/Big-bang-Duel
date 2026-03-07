import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseRoom } from "../../hooks/useFirebase";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { CHARACTERS, getAvatarCrop } from "../../lib/characters";
import type {
  AttackTimer,
  GameMode,
  Room as RoomType,
  RoomConfig,
} from "../../types";

const MODES = [
  {
    id: "beginner" as GameMode,
    name: "INICIANTE",
    color: "border-green-600/40",
    active: "border-green-400 bg-green-900/30 text-green-300",
  },
  {
    id: "normal" as GameMode,
    name: "NORMAL",
    color: "border-yellow-600/40",
    active: "border-gold bg-gold/20 text-gold",
  },
  {
    id: "advanced" as GameMode,
    name: "AVANÇADO",
    color: "border-red-600/40",
    active: "border-red-400 bg-red-900/30 text-red-300",
  },
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
  const { createRoom, joinRoom, getUserRooms, getPublicRooms } =
    useFirebaseRoom();
  const user = useAuthStore((s) => s.user);

  // Initialise from persisted preference so selection is consistent across screens
  const [selectedChar, setSelectedChar] = useState(
    () => user?.avatar ?? "marshal",
  );
  const [selectedMode, setSelectedMode] = useState<GameMode>("normal");

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [attackTimer, setAttackTimer] = useState<AttackTimer>(10);
  const [bestOf3, setBestOf3] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const [activeRooms, setActiveRooms] = useState<RoomType[]>([]);
  const [publicRooms, setPublicRooms] = useState<RoomType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeTab, setActiveTab] = useState<"mine" | "public">("mine");

  useEffect(() => {
    loadAllRooms();
  }, []);

  const loadAllRooms = async () => {
    setLoadingRooms(true);
    const [mine, pub] = await Promise.all([getUserRooms(), getPublicRooms()]);
    setActiveRooms(mine);
    setPublicRooms(pub);
    setLoadingRooms(false);
  };

  const handleCreate = async () => {
    const config: RoomConfig = { isPublic, attackTimer, bestOf3 };
    const roomId = await createRoom(selectedMode, config, selectedChar);
    if (roomId) {
      useGameStore
        .getState()
        .initializeGame(
          selectedMode,
          true,
          true,
          roomId,
          undefined,
          selectedChar,
          { attackTimer, bestOf3, isPublic },
          user?.displayName,
        );
      navigate(`/game/${roomId}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.length !== 6) {
      setError("Código deve ter 6 caracteres");
      return;
    }
    const room = await joinRoom(joinCode.toUpperCase(), selectedChar);
    if (room) {
      useGameStore
        .getState()
        .initializeGame(
          room.mode,
          true,
          false,
          room.id,
          undefined,
          selectedChar,
          {
            attackTimer: room.config?.attackTimer ?? 10,
            bestOf3: room.config?.bestOf3 ?? false,
            isPublic: room.config?.isPublic ?? false,
          },
          user?.displayName,
        );
      navigate(`/game/${room.id}`);
    } else {
      setError("Sala não encontrada ou cheia");
    }
  };

  const handleJoinPublic = async (room: RoomType) => {
    const joined = await joinRoom(room.id, selectedChar);
    if (joined) {
      useGameStore
        .getState()
        .initializeGame(
          room.mode,
          true,
          false,
          room.id,
          undefined,
          selectedChar,
          {
            attackTimer: room.config?.attackTimer ?? 10,
            bestOf3: room.config?.bestOf3 ?? false,
            isPublic: true,
          },
          user?.displayName,
        );
      navigate(`/game/${room.id}`);
    } else {
      setError("Sala não disponível");
    }
  };

  const resumeGame = (room: RoomType) => navigate(`/game/${room.id}`);

  const modeLabel = (m: GameMode) =>
    ({ beginner: "INICIANTE", normal: "NORMAL", advanced: "AVANÇADO" })[m];
  const timerLabel = (t: number) => `${t}s`;

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ══ LEFT — configuration ══ */}
        <div className="flex flex-col gap-4">
          <h1 className="font-western text-4xl text-gold text-center md:text-left text-glow-gold animate-drop-bounce">
            SALÃO ONLINE
          </h1>

          {/* 1 — Character */}
          <div className="card-wood p-4 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-western text-[10px] text-sand/60 tracking-widest uppercase">
                1. Seu Pistoleiro
              </h3>
              <button
                onClick={() => navigate("/characters")}
                className="font-stats text-[9px] text-gold/60 hover:text-gold uppercase tracking-widest transition-colors"
              >
                Ver galeria →
              </button>
            </div>
            {/* Scrollable row of face-cropped avatars */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {CHARACTERS.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedChar(char.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 transition-all ${selectedChar === char.id ? "scale-105" : ""}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${selectedChar === char.id ? "border-gold shadow-[0_0_8px_rgba(234,179,8,0.5)]" : "border-sand/20 hover:border-sand/50"}`}
                  >
                    <img
                      src={char.image}
                      alt={char.name}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: getAvatarCrop(char.id) }}
                    />
                  </div>
                  {selectedChar === char.id && (
                    <span className="font-western text-[7px] text-gold tracking-wide whitespace-nowrap">
                      {char.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2 — Mode */}
          <div className="card-wood p-4 animate-fade-up animate-fade-up-delay-1">
            <h3 className="font-western text-[10px] text-sand/60 text-center mb-3 tracking-widest uppercase">
              2. Dificuldade
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`py-2 px-1 rounded-lg border-2 font-western text-[10px] tracking-tighter transition-all ${selectedMode === mode.id ? mode.active + " scale-105" : `${mode.color} bg-black/20 text-sand/60 hover:border-sand/40`}`}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* 3 — Advanced Options */}
          <div className="card-wood animate-fade-up animate-fade-up-delay-2 overflow-hidden">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full p-4 flex items-center justify-between"
            >
              <h3 className="font-western text-[10px] text-sand/60 tracking-widest uppercase">
                3. Opções Avançadas
              </h3>
              <div className="flex items-center gap-1.5">
                {isPublic && (
                  <span className="text-[8px] font-stats uppercase px-1.5 py-0.5 rounded border border-sky-500/50 text-sky-400">
                    Pública
                  </span>
                )}
                {bestOf3 && (
                  <span className="text-[8px] font-stats uppercase px-1.5 py-0.5 rounded border border-purple-500/50 text-purple-400">
                    MD3
                  </span>
                )}
                {attackTimer !== 10 && (
                  <span className="text-[8px] font-stats uppercase px-1.5 py-0.5 rounded border border-orange-500/50 text-orange-400">
                    {timerLabel(attackTimer)}
                  </span>
                )}
                <svg
                  className={`w-4 h-4 text-sand/50 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {showAdvanced && (
              <div className="px-4 pb-4 flex flex-col gap-5 border-t border-sand/10 pt-4">
                {/* Public toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-western text-[11px] text-sand tracking-wide">
                      Sala Pública
                    </p>
                    <p className="font-stats text-[9px] text-sand/50 uppercase mt-0.5">
                      Visível na lista de salas abertas
                    </p>
                  </div>
                  <Toggle
                    checked={isPublic}
                    onChange={setIsPublic}
                    label="Sala pública"
                  />
                </div>

                {/* Best of 3 toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-western text-[11px] text-sand tracking-wide">
                      Melhor de 3
                    </p>
                    <p className="font-stats text-[9px] text-sand/50 uppercase mt-0.5">
                      Primeiro a vencer 2 rounds leva o duelo
                    </p>
                  </div>
                  <Toggle
                    checked={bestOf3}
                    onChange={setBestOf3}
                    label="Melhor de 3"
                  />
                </div>

                {/* Attack timer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-western text-[11px] text-sand tracking-wide">
                        Tempo de Ataque
                      </p>
                      <p className="font-stats text-[9px] text-sand/50 uppercase mt-0.5">
                        Carta aleatória ao expirar o tempo
                      </p>
                    </div>
                    <span className="font-western text-gold text-sm">
                      {timerLabel(attackTimer)}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {TIMER_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setAttackTimer(value)}
                        className={`flex-1 py-1.5 rounded-lg font-stats text-[10px] uppercase transition-all border ${attackTimer === value ? "border-orange-400 bg-orange-900/40 text-orange-300" : "border-sand/20 bg-black/20 text-sand/50 hover:border-sand/40"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4 — Create / Join */}
          <div className="card-wood p-6 animate-fade-up animate-fade-up-delay-3">
            {activeRooms.length > 0 ? (
              <div className="bg-black/40 border border-red-west/30 p-4 rounded-xl mb-4 text-center">
                <span className="font-western text-gold block mb-1">
                  LIMITE ATINGIDO
                </span>
                <span className="font-stats text-xs text-sand/70 uppercase">
                  Você já possui uma sala ativa. Encerre ou jogue sua sala atual
                  antes de criar outra.
                </span>
              </div>
            ) : (
              <button onClick={handleCreate} className="btn-western mb-4">
                CRIAR NOVINHA
              </button>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-sand/20" />
              <span className="font-western text-xs text-sand/40 tracking-widest uppercase">
                Ou Entrar
              </span>
              <div className="flex-1 h-px bg-sand/20" />
            </div>

            <form onSubmit={handleJoin} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="CÓDIGO"
                maxLength={6}
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value);
                  setError("");
                }}
                className="input-parchment text-center text-xl font-western uppercase tracking-[0.3em]"
              />
              {error && (
                <div className="text-red-400 font-stats text-[10px] text-center">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="btn-western btn-sky py-2 text-sm"
              >
                ENTRAR
              </button>
            </form>
          </div>

          <button
            onClick={() => navigate("/menu")}
            className="w-full text-center text-sand/50 font-western text-sm hover:text-sand transition-colors"
          >
            VOLTAR AO MENU
          </button>
        </div>

        {/* ══ RIGHT — rooms ══ */}
        <div className="flex flex-col gap-4 animate-fade-up animate-fade-up-delay-3">
          {/* Tab header */}
          <div className="flex rounded-xl overflow-hidden border border-sand/20">
            <button
              onClick={() => setActiveTab("mine")}
              className={`flex-1 py-2.5 font-western text-xs tracking-widest uppercase transition-all ${activeTab === "mine" ? "bg-gold/20 text-gold" : "bg-black/40 text-sand/50 hover:bg-black/60"}`}
            >
              Suas Salas
            </button>
            <button
              onClick={() => {
                setActiveTab("public");
                loadAllRooms();
              }}
              className={`flex-1 py-2.5 font-western text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border-l border-sand/20 ${activeTab === "public" ? "bg-sky-900/40 text-sky-300" : "bg-black/40 text-sand/50 hover:bg-black/60"}`}
            >
              Públicas
              {publicRooms.length > 0 && (
                <span className="text-[8px] bg-sky-500/30 border border-sky-500/50 text-sky-300 px-1.5 py-0.5 rounded-full font-stats">
                  {publicRooms.length}
                </span>
              )}
            </button>
          </div>

          <div className="card-wood flex-1 p-4 min-h-[300px] overflow-y-auto">
            {loadingRooms ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="w-10 h-10 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
                <span className="font-western text-xs text-sand tracking-widest">
                  PROCURANDO...
                </span>
              </div>
            ) : activeTab === "mine" ? (
              activeRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-western text-xs text-center px-8">
                    Nenhuma sala ativa encontrada por aqui, cowboy.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-black/40 border border-gold/20 rounded-xl p-3 flex justify-between items-center hover:border-gold/50 transition-all group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-western text-gold text-lg tracking-widest">
                            {room.id}
                          </span>
                          <span
                            className={`text-[8px] px-1.5 py-0.5 rounded border font-stats uppercase ${room.status === "waiting" ? "border-yellow-500/50 text-yellow-500" : "border-green-500/50 text-green-500"}`}
                          >
                            {room.status === "waiting"
                              ? "Aguardando"
                              : "Em Jogo"}
                          </span>
                        </div>
                        <span className="text-[10px] text-sand/50 font-stats uppercase">
                          {room.hostName} vs {room.guestName || "???"} •{" "}
                          {modeLabel(room.mode)}
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {room.config?.isPublic && (
                            <span className="text-[7px] px-1 py-0.5 rounded border border-sky-500/40 text-sky-400 font-stats uppercase">
                              Pública
                            </span>
                          )}
                          {room.config?.bestOf3 && (
                            <span className="text-[7px] px-1 py-0.5 rounded border border-purple-500/40 text-purple-400 font-stats uppercase">
                              MD3
                            </span>
                          )}
                          {room.config?.attackTimer && (
                            <span className="text-[7px] px-1 py-0.5 rounded border border-orange-500/40 text-orange-400 font-stats uppercase">
                              {room.config.attackTimer}s
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => resumeGame(room)}
                        className="bg-gold/10 hover:bg-gold/20 border border-gold/30 px-4 py-1.5 rounded font-western text-[10px] text-gold tracking-widest transition-all group-hover:scale-105"
                      >
                        RETOMAR
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : publicRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                  />
                </svg>
                <span className="font-western text-xs text-center px-8">
                  Nenhuma sala pública disponível no momento.
                </span>
                <button
                  onClick={loadAllRooms}
                  className="font-stats text-[10px] text-gold/60 hover:text-gold uppercase tracking-widest mt-2"
                >
                  Atualizar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {publicRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-black/40 border border-sky-500/20 rounded-xl p-3 flex justify-between items-center hover:border-sky-500/50 transition-all group"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-western text-sky-300 text-base tracking-widest">
                          {room.id}
                        </span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-yellow-500/50 text-yellow-500 font-stats uppercase">
                          Aguardando
                        </span>
                      </div>
                      <span className="text-[10px] text-sand/50 font-stats uppercase">
                        {room.hostName} • {modeLabel(room.mode)}
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {room.config?.bestOf3 && (
                          <span className="text-[7px] px-1 py-0.5 rounded border border-purple-500/40 text-purple-400 font-stats uppercase">
                            MD3
                          </span>
                        )}
                        {room.config?.attackTimer && (
                          <span className="text-[7px] px-1 py-0.5 rounded border border-orange-500/40 text-orange-400 font-stats uppercase">
                            {room.config.attackTimer}s
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinPublic(room)}
                      className="bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 px-4 py-1.5 rounded font-western text-[10px] text-sky-300 tracking-widest transition-all group-hover:scale-105"
                    >
                      ENTRAR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={loadAllRooms}
            className="text-center text-sand/30 font-stats text-[9px] uppercase tracking-widest hover:text-sand/60 transition-colors"
          >
            ↻ Atualizar listas
          </button>
        </div>
      </div>
    </div>
  );
}
