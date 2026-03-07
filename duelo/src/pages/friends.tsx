import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useFriendsStore } from "../store/friendsStore";
import { getCharacter, getAvatarCrop } from "../lib/characters";
import type { Friend, OnlineStatus } from "../types";

const STATUS_COLORS: Record<OnlineStatus, string> = {
  online: "bg-green-400",
  in_game: "bg-yellow-400",
  offline: "bg-gray-500",
};

const STATUS_LABELS: Record<OnlineStatus, string> = {
  online: "Online",
  in_game: "Em Jogo",
  offline: "Offline",
};

type Tab = "friends" | "requests" | "add";

export default function FriendsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const getProfile = useAuthStore((s) => s.getProfile);

  const friends = useFriendsStore((s) => s.friends);
  const pendingRequests = useFriendsStore((s) => s.pendingRequests);
  const isLoading = useFriendsStore((s) => s.isLoading);
  const sendRequest = useFriendsStore((s) => s.sendRequest);
  const acceptRequest = useFriendsStore((s) => s.acceptRequest);
  const rejectRequest = useFriendsStore((s) => s.rejectRequest);
  const removeFriendAction = useFriendsStore((s) => s.removeFriend);
  const startListening = useFriendsStore((s) => s.startListening);
  const stopListening = useFriendsStore((s) => s.stopListening);

  const [tab, setTab] = useState<Tab>("friends");
  const [friendCode, setFriendCode] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      startListening(user.uid);
    }
    return () => stopListening();
    // Only re-run when uid changes
  }, [user?.uid, startListening, stopListening]);

  const handleSendRequest = async () => {
    if (!friendCode.trim()) return;
    setSendError(null);
    setSendSuccess(false);

    const profile = getProfile();
    if (!profile) return;

    const err = await sendRequest(profile, friendCode);
    if (err) {
      setSendError(err);
    } else {
      setSendSuccess(true);
      setFriendCode("");
      setTimeout(() => setSendSuccess(false), 3000);
    }
  };

  const handleAccept = async (requestId: string) => {
    const profile = getProfile();
    if (!profile) return;
    setAcceptError(null);
    try {
      console.log("[handleAccept] Accepting request...", requestId);
      await acceptRequest(requestId, profile);
      console.log("[handleAccept] Request accepted ✓");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[handleAccept] ERROR:", errorMsg, error);
      const displayError = `Nao foi possivel aceitar o convite. Erro: ${errorMsg}`;
      setAcceptError(displayError);
    }
  };

  const handleInviteToPlay = (friend: Friend) => {
    // Navigate to online lobby with friend's uid pre-filled for invite
    navigate("/online", { state: { inviteFriend: friend } });
  };

  // Sort: online first, then in_game, then offline
  const sortedFriends = [...friends].sort((a, b) => {
    const order: Record<OnlineStatus, number> = {
      online: 0,
      in_game: 1,
      offline: 2,
    };
    return (order[a.onlineStatus] ?? 2) - (order[b.onlineStatus] ?? 2);
  });

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-start justify-center bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg mx-4 py-8">
        {/* Header */}
        <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
          AMIGOS
        </h1>
        <p className="text-center font-stats text-sm text-sand/50 mb-6">
          Sua gangue do Velho Oeste
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "friends" as Tab, label: "Amigos", count: friends.length },
            {
              id: "requests" as Tab,
              label: "Convites",
              count: pendingRequests.length,
            },
            { id: "add" as Tab, label: "Adicionar", count: 0 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl font-western text-sm tracking-wider transition-all relative ${
                tab === t.id
                  ? "bg-gold/20 border-2 border-gold/60 text-gold"
                  : "bg-black/30 border-2 border-sand/10 text-sand/60 hover:border-sand/30"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-stats font-bold flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card-wood p-4 rounded-2xl min-h-[300px]">
          {/* ─── Friends List ─── */}
          {tab === "friends" && (
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full mx-auto" />
                </div>
              ) : sortedFriends.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-sand/20 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="font-stats text-sm text-sand/40">
                    Nenhum amigo ainda
                  </p>
                  <p className="font-stats text-xs text-sand/30 mt-1">
                    Adicione amigos pelo código de jogador!
                  </p>
                </div>
              ) : (
                sortedFriends.map((friend) => {
                  const char = getCharacter(friend.avatar);
                  return (
                    <div
                      key={friend.uid}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 border border-sand/10 hover:border-sand/20 transition-all"
                    >
                      {/* Avatar + Status Dot */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full border-2 border-sand/30 overflow-hidden">
                          <img
                            src={char.image}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{
                              objectPosition: getAvatarCrop(friend.avatar),
                            }}
                          />
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black ${STATUS_COLORS[friend.onlineStatus]}`}
                        />
                      </div>

                      {/* Name + Status */}
                      <div className="flex-1 min-w-0">
                        <div className="font-western text-sm text-sand-light tracking-wider truncate">
                          {friend.displayName}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-sand/40">
                            {friend.playerCode}
                          </span>
                          <span
                            className={`font-stats text-[9px] ${
                              friend.onlineStatus === "online"
                                ? "text-green-400"
                                : friend.onlineStatus === "in_game"
                                  ? "text-yellow-400"
                                  : "text-sand/30"
                            }`}
                          >
                            {STATUS_LABELS[friend.onlineStatus]}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        {friend.onlineStatus !== "offline" && (
                          <button
                            onClick={() => handleInviteToPlay(friend)}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 font-stats text-[10px] font-bold hover:bg-green-500/30 transition-all"
                            title="Convidar para jogar"
                          >
                            JOGAR
                          </button>
                        )}
                        {confirmRemove === friend.uid ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                removeFriendAction(user.uid, friend.uid);
                                setConfirmRemove(null);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-stats text-[10px] font-bold"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="px-2 py-1.5 rounded-lg bg-black/30 border border-sand/20 text-sand/60 font-stats text-[10px]"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(friend.uid)}
                            className="p-1.5 rounded-lg bg-black/20 border border-sand/10 text-sand/30 hover:text-red-400 hover:border-red-400/30 transition-all"
                            title="Remover amigo"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Pending Requests ─── */}
          {tab === "requests" && (
            <div className="space-y-2">
              {acceptError && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-stats text-xs">
                  {acceptError}
                </div>
              )}
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-sand/20 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="font-stats text-sm text-sand/40">
                    Nenhum convite pendente
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => {
                  const char = getCharacter(req.fromAvatar);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20 border border-gold/20 animate-fade-up"
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-gold/40 overflow-hidden flex-shrink-0">
                        <img
                          src={char.image}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: getAvatarCrop(req.fromAvatar),
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-western text-sm text-sand-light tracking-wider truncate">
                          {req.fromDisplayName}
                        </div>
                        <span className="font-mono text-[10px] text-sand/40">
                          {req.fromPlayerCode}
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 font-stats text-[10px] font-bold hover:bg-green-500/30 transition-all"
                        >
                          ACEITAR
                        </button>
                        <button
                          onClick={() => rejectRequest(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-stats text-[10px] font-bold hover:bg-red-500/30 transition-all"
                        >
                          RECUSAR
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Add Friend ─── */}
          {tab === "add" && (
            <div className="py-4 space-y-6">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gold/30 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <p className="font-stats text-sm text-sand/60">
                  Digite o código do jogador para enviar um convite
                </p>
              </div>

              {/* My Code */}
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="font-stats text-[10px] text-sand/40 uppercase tracking-widest mb-1">
                  Seu Código
                </p>
                <p className="font-mono text-2xl text-gold font-bold tracking-widest">
                  {user.playerCode || "..."}
                </p>
              </div>

              {/* Input */}
              <div>
                <label className="font-stats text-[10px] text-sand/50 uppercase tracking-widest block mb-2">
                  Código do Amigo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendCode}
                    onChange={(e) => {
                      setFriendCode(e.target.value.toUpperCase());
                      setSendError(null);
                      setSendSuccess(false);
                    }}
                    placeholder="#A0B1C2D4"
                    maxLength={9}
                    className="flex-1 px-4 py-3 rounded-xl bg-black/40 border-2 border-sand/20 focus:border-gold/60 text-sand-light font-mono text-lg tracking-widest outline-none transition-colors placeholder:text-sand/20"
                  />
                  <button
                    onClick={handleSendRequest}
                    disabled={friendCode.replace("#", "").length < 8}
                    className="btn-western px-6 text-sm disabled:opacity-40"
                  >
                    ENVIAR
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {sendError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 font-stats text-sm text-center animate-fade-up">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 font-stats text-sm text-center animate-fade-up">
                  Convite enviado com sucesso!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back */}
        <button
          onClick={() => navigate("/menu")}
          className="btn-western btn-danger mt-6 max-w-xs mx-auto"
        >
          VOLTAR AO MENU
        </button>
      </div>
    </div>
  );
}
