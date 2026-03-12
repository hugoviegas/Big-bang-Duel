/**
 * Match History Page – Displays player's last 10 matches with detailed statistics
 * and charts showing performance trends and achievements unlocked.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Flame, Target, Shield } from "lucide-react";
import type { MatchSummary } from "../types";
import { getPlayerMatchHistory } from "../lib/firebaseService";
import { useAuthStore } from "../store/authStore";
import "../styles/matchHistory.css";

export default function MatchHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load match history on mount
  useEffect(() => {
    if (!user?.uid) {
      navigate("/");
      return;
    }

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const history = await getPlayerMatchHistory(user.uid, 10);
        setMatches(history);
      } catch (err) {
        console.error("[matchHistory] Error loading match history:", err);
        setError("Erro ao carregar histórico de partidas");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [user?.uid, navigate]);

  // Format timestamp to readable date/time
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (isYesterday) {
      return `Ontem às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }

    return date.toLocaleDateString("pt-BR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate performance badge
  const getResultBadge = (result: "win" | "loss" | "draw") => {
    switch (result) {
      case "win":
        return { text: "Vitória", className: "badge-win", icon: "🏆" };
      case "loss":
        return { text: "Derrota", className: "badge-loss", icon: "❌" };
      case "draw":
        return { text: "Empate", className: "badge-draw", icon: "⚖️" };
    }
  };

  return (
    <div className="match-history-page">
      {/* Header */}
      <div className="page-header">
        <button
          onClick={() => navigate(-1)}
          className="back-button"
          title="Voltar"
        >
          <ChevronLeft size={24} />
        </button>
        <h1>Histórico de Partidas</h1>
        <div className="header-spacer" />
      </div>

      {/* Content */}
      <div className="page-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Carregando histórico...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma partida registrada ainda</p>
            <p className="text-sm">Jogue contra seus amigos para começar!</p>
          </div>
        ) : (
          <div className="matches-list">
            {matches.map((match, idx) => {
              const resultBadge = getResultBadge(match.result);
              const dodgeRate =
                match.successfulDodges + (match.shots + match.doubleShots) > 0
                  ? (
                      ((match.successfulDodges /
                        (match.successfulDodges + match.shots + match.doubleShots)) *
                        100)
                    ).toFixed(1)
                  : "0";

              return (
                <div key={match.matchId} className="match-card">
                  {/* Match Header */}
                  <div className="match-header">
                    <div className="match-result">
                      <span className={`result-badge ${resultBadge.className}`}>
                        {resultBadge.icon} {resultBadge.text}
                      </span>
                    </div>
                    <div className="match-mode">
                      <span className="mode-tag">
                        {match.mode === "online" ? "🌐 Online" : "⚔️ Solo"}
                      </span>
                    </div>
                    <div className="match-date">
                      <time>{formatDate(match.timestamp)}</time>
                    </div>
                  </div>

                  {/* Match Stats Grid */}
                  <div className="match-stats-grid">
                    {/* Offensive Stats */}
                    <div className="stat-group">
                      <div className="stat-title">
                        <Target size={16} />
                        Ofensiva
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Tiros:</span>
                        <span className="stat-value">{match.shots}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Tiros Duplos:</span>
                        <span className="stat-value">{match.doubleShots}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Dano Causado:</span>
                        <span className="stat-value">{match.damageDealt}</span>
                      </div>
                    </div>

                    {/* Defensive Stats */}
                    <div className="stat-group">
                      <div className="stat-title">
                        <Shield size={16} />
                        Defesa
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Desvios:</span>
                        <span className="stat-value">
                          {match.successfulDodges}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Contra-Golpes:</span>
                        <span className="stat-value">
                          {match.successfulCounters}
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Dano Recebido:</span>
                        <span className="stat-value">{match.damageTaken}</span>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="stat-group">
                      <div className="stat-title">
                        <Flame size={16} />
                        Performance
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Turnos:</span>
                        <span className="stat-value">{match.turns}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Taxa Desvio:</span>
                        <span className="stat-value">{dodgeRate}%</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">Vida Restante:</span>
                        <span className="stat-value">
                          {match.remainingLife}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Match Footer */}
                  <div className="match-footer">
                    <span className="match-count">
                      Partida #{matches.length - idx}
                    </span>
                    <span
                      className="match-id"
                      title={match.matchId}
                    >
                      ID: {match.matchId.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
