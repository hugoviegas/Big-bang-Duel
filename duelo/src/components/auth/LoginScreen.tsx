import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuthStore } from "../../store/authStore";
import {
  createPlayerProfile,
  generateUniquePlayerCode,
} from "../../lib/firebaseService";
import {
  calculateProgression,
  normalizeCurrencies,
  normalizeRanked,
  normalizeUnlocks,
} from "../../lib/progression";
import type { PlayerProfile } from "../../types";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      let firebaseUser;

      if (isRegistering) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        firebaseUser = credential.user;
        const name = displayName.trim() || "Pistoleiro Anônimo";
        await updateProfile(firebaseUser, { displayName: name });
        // Create Firestore player profile immediately for newly registered users
        try {
          const playerCode = await generateUniquePlayerCode();
          const profile: PlayerProfile = {
            uid: firebaseUser.uid,
            displayName: name,
            playerCode,
            avatar: "marshal",
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
            winRate: 0,
            progression: calculateProgression(0),
            currencies: normalizeCurrencies({}),
            ranked: normalizeRanked({}),
            unlocks: normalizeUnlocks({}),
            characterStats: {},
            achievements: {},
            favoriteCharacter: undefined,
            winStreak: 0,
            perfectWins: 0,
            highLifeWins: 0,
            opponentsFaced: [],
            onlinePlayersDefeated: [],
            createdAt: Date.now(),
            lastSeen: Date.now(),
            onlineStatus: "online",
          };
          await createPlayerProfile(profile);
        } catch (err: unknown) {
          console.error("Could not create player profile immediately:", err);
          // Surface a user-friendly message for immediate troubleshooting
          setErrorMsg(
            "Não foi possível criar o perfil no servidor — sua conta pode não sincronizar até reconectar.",
          );
        }
      } else {
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        firebaseUser = credential.user;
      }

      const name =
        firebaseUser.displayName || displayName.trim() || "Pistoleiro Anônimo";

      // If the store already has this exact UID, preserve all existing data
      // (stats, playerCode) and just navigate — don't reset anything.
      const storedUser = useAuthStore.getState().user;
      if (storedUser?.uid === firebaseUser.uid) {
        navigate("/menu", { replace: true });
        return;
      }

      // playerCode is intentionally empty here.
      // ensureProfile() in menu.tsx will load it from Firestore (returning users)
      // or generate + save a new one (first-time users).
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: name,
        playerCode: "",
        avatar: "marshal",
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winRate: 0,
        statsByMode: {
          solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          overall: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
        },
        createdAt: new Date(),
      });

      navigate("/menu", { replace: true });
    } catch (error: unknown) {
      console.error("Login error:", error);
      if (typeof error === "object" && error !== null && "code" in error) {
        setErrorMsg(
          getAuthErrorMessage((error as { code?: string }).code ?? ""),
        );
      } else {
        setErrorMsg("Erro ao autenticar. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const credential = await signInAnonymously(auth);
      const firebaseUser = credential.user;

      // Firebase Anonymous Auth reuses the same anonymous UID on the same
      // browser until explicit logout. If the store already has this UID,
      // just navigate — don't overwrite the existing playerCode/stats.
      const storedUser = useAuthStore.getState().user;
      if (storedUser?.uid === firebaseUser.uid) {
        navigate("/menu", { replace: true });
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      setUser({
        uid: firebaseUser.uid,
        email: "",
        displayName: "Pistoleiro Forasteiro",
        playerCode: "", // ensureProfile() will create/load
        avatar: "marshal",
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winRate: 0,
        statsByMode: {
          solo: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          online: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
          overall: { wins: 0, losses: 0, draws: 0, totalGames: 0, winRate: 0 },
        },
        createdAt: new Date(),
        isGuest: true,
        expiresAt: expiresAt.getTime(),
      });

      navigate("/menu", { replace: true });
    } catch (error) {
      console.error("Guest login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  function getAuthErrorMessage(code: string): string {
    switch (code) {
      case "auth/email-already-in-use":
        return "Este email já está cadastrado. Tente fazer login.";
      case "auth/invalid-email":
        return "Email inválido.";
      case "auth/weak-password":
        return "Senha muito fraca. Use no mínimo 6 caracteres.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Email ou senha incorretos.";
      case "auth/too-many-requests":
        return "Muitas tentativas. Tente novamente mais tarde.";
      case "auth/operation-not-allowed":
        return "Método de login não habilitado. Contate o suporte.";
      default:
        return "Erro ao autenticar. Tente novamente.";
    }
  }

  return (
    <div className="w-full max-w-sm mx-4">
      {/* Logo */}
      <div className="text-center mb-8 animate-drop-bounce">
        <img
          src="/assets/ui/logo_bbd.webp"
          alt="Big Bang Duel"
          className="w-48 h-auto mx-auto animate-logo-float drop-shadow-2xl"
        />
      </div>

      {/* Wanted Poster Card */}
      <div className="relative bg-[#F5E6C8] p-8 rounded-lg shadow-2xl border-4 border-[#3B1F0A] animate-fade-up">
        {/* Decorative nail holes */}
        <div className="absolute -top-2 left-6 w-4 h-4 rounded-full bg-brown-dark shadow-inner" />
        <div className="absolute -top-2 right-6 w-4 h-4 rounded-full bg-brown-dark shadow-inner" />

        {/* WANTED banner */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#D4A855] px-8 py-1.5 border-3 border-[#3B1F0A] shadow-lg transform -rotate-1">
          <h2 className="font-western text-2xl text-[#3B1F0A] tracking-widest">
            {isRegistering ? "REGISTRO" : "PROCURADO"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isRegistering && (
            <div className="animate-fade-up">
              <label className="block font-western text-sm text-[#3B1F0A] mb-1 tracking-wider">
                NOME DE PISTOLEIRO
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Billy The Kid"
                className="input-parchment"
                minLength={3}
              />
            </div>
          )}
          <div>
            <label className="block font-western text-sm text-[#3B1F0A] mb-1 tracking-wider">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pistoleiro@oeste.com"
              className="input-parchment"
              required
            />
          </div>
          <div>
            <label className="block font-western text-sm text-[#3B1F0A] mb-1 tracking-wider">
              SENHA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="input-parchment"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
          {errorMsg && (
            <p className="text-red-700 font-stats text-sm text-center bg-red-100 border border-red-300 rounded px-3 py-2">
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            className="btn-western mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "ENTRANDO..."
              : isRegistering
                ? "CRIAR CONTA"
                : "ENTRAR"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="font-stats text-[#7B4A1E] hover:text-[#C0392B] underline text-sm transition-colors"
          >
            {isRegistering
              ? "Já tenho conta. Entrar."
              : "Novo por aqui? Criar conta."}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-[#7B4A1E]/40" />
          <span className="font-western text-xs text-[#7B4A1E] tracking-widest">
            OU
          </span>
          <div className="flex-1 h-px bg-[#7B4A1E]/40" />
        </div>

        {/* Guest Login */}
        <button
          onClick={handleGuestLogin}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#3B1F0A] border-2 border-[#3B1F0A] rounded-lg hover:bg-[#1a0f06] transition-all font-western text-[#D4A855] shadow-md hover:shadow-lg mb-3 disabled:opacity-60"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            ></path>
          </svg>
          ENTRAR COMO CONVIDADO
        </button>

        {/* Google OAuth */}
        <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-stats font-bold text-gray-700 shadow-md hover:shadow-lg">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Entrar com Google
        </button>
      </div>
    </div>
  );
}
