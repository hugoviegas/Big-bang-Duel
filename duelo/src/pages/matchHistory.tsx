/**
 * Match History Page – Displays player's last 10 matches with detailed statistics
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Flame,
  Target,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

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
                      (match.successfulDodges /
                        (match.successfulDodges +
                          match.shots +
                          match.doubleShots)) *
                      100
                    ).toFixed(1)
                  : "0";

              const isExpanded = expandedMatchId === match.matchId;

              return (
                <div
                  key={match.matchId}
                  className={`match-card ${isExpanded ? "expanded" : ""}`}
                >
                  {/* Match Summary - Always Visible */}
                  <button
                    onClick={() =>
                      setExpandedMatchId(isExpanded ? null : match.matchId)
                    }
                    className="match-summary"
                  >
                    {/* Result Badge */}
                    <div className="summary-result">
                      <span className={`result-badge ${resultBadge.className}`}>
                        {resultBadge.icon}
                      </span>
                    </div>

                    {/* Match Info */}
                    <div className="summary-info">
                      <div className="summary-mode">
                        {match.mode === "online" ? "🌐" : "⚔️"}
                      </div>
                      <div className="summary-date">
                        {formatDate(match.timestamp)}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="summary-stats">
                      <span className="quick-stat" title="Tiros">
                        🎯 {match.shots}
                      </span>
                      <span className="quick-stat" title="Desvios">
                        🛡️ {match.successfulDodges}
                      </span>
                      <span
                        className="quick-stat"
                        title={`${match.damageDealt} dano / ${match.damageTaken} recebido`}
                      >
                        ⚔️ {match.damageDealt}/{match.damageTaken}
                      </span>
                    </div>

                    {/* Expand Toggle */}
                    <div className="expand-toggle">
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="match-details">
                      <div className="details-grid">
                        {/* Offensive Stats */}
                        <div className="detail-section">
                          <div className="detail-title">
                            <Target size={14} />
                            Ofensiva
                          </div>
                          <div className="detail-row">
                            <span>Tiros</span>
                            <span className="detail-value">{match.shots}</span>
                          </div>
                          <div className="detail-row">
                            <span>Tiros Duplos</span>
                            <span className="detail-value">
                              {match.doubleShots}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>Dano Causado</span>
                            <span className="detail-value">
                              {match.damageDealt}
                            </span>
                          </div>
                        </div>

                        {/* Defensive Stats */}
                        <div className="detail-section">
                          <div className="detail-title">
                            <Shield size={14} />
                            Defesa
                          </div>
                          <div className="detail-row">
                            <span>Desvios</span>
                            <span className="detail-value">
                              {match.successfulDodges}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>Contra-Golpes</span>
                            <span className="detail-value">
                              {match.successfulCounters}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>Dano Recebido</span>
                            <span className="detail-value">
                              {match.damageTaken}
                            </span>
                          </div>
                        </div>

                        {/* Performance Stats */}
                        <div className="detail-section">
                          <div className="detail-title">
                            <Flame size={14} />
                            Performance
                          </div>
                          <div className="detail-row">
                            <span>Turnos</span>
                            <span className="detail-value">{match.turns}</span>
                          </div>
                          <div className="detail-row">
                            <span>Taxa Desvio</span>
                            <span className="detail-value">{dodgeRate}%</span>
                          </div>
                          <div className="detail-row">
                            <span>Vida Restante</span>
                            <span className="detail-value">
                              {match.remainingLife}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Match Footer Info */}
                      <div className="details-footer">
                        <span className="match-count">
                          Partida #{matches.length - idx}
                        </span>
                        <span className="match-id" title={match.matchId}>
                          {match.matchId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
