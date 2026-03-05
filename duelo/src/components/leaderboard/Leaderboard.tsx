import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '../../types';

export function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock fetching leaderboard data
  useEffect(() => {
    setTimeout(() => {
      setEntries([
        { uid: '1', displayName: 'PistoleiroLendario', avatar: 'marshal', wins: 45, winRate: 75, totalGames: 60, rank: 1 },
        { uid: '2', displayName: 'GatilhoRapido', avatar: 'villain', wins: 38, winRate: 65, totalGames: 58, rank: 2 },
        { uid: '3', displayName: 'SemPiedade', avatar: 'villain', wins: 30, winRate: 60, totalGames: 50, rank: 3 },
        { uid: 'user123', displayName: 'Pistoleiro Misterioso', avatar: 'marshal', wins: 15, winRate: 50, totalGames: 30, rank: 42 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-sand flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl bg-parchment rounded-xl shadow-2xl border-8 border-brown-dark overflow-hidden">
        
        {/* Header */}
        <div className="bg-brown-dark py-6 px-8 flex justify-between items-center text-gold border-b-4 border-[#5A3215]">
          <h1 className="font-western text-5xl drop-shadow-md">RANKING DO OESTE</h1>
          <button 
            onClick={() => navigate('/menu')}
            className="font-stats font-bold text-xl px-4 py-2 bg-red-west hover:bg-red-700 rounded text-white shadow-md transition-colors"
          >
            VOLTAR
          </button>
        </div>

        {/* Filters */}
        <div className="flex bg-[#D4A855]/30 border-b-2 border-brown-dark/20 text-brown-dark font-stats font-bold uppercase">
          <button className="flex-1 py-3 bg-[#D4A855]/50 border-b-4 border-brown-dark">TODOS OS TEMPOS</button>
          <button className="flex-1 py-3 hover:bg-[#D4A855]/40 transition-colors">ESTE MÊS</button>
          <button className="flex-1 py-3 hover:bg-[#D4A855]/40 transition-colors">ESTA SEMANA</button>
        </div>

        {/* Content */}
        <div className="p-6 h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-brown-dark border-t-gold rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left font-stats text-lg text-brown-dark border-collapse">
              <thead>
                <tr className="border-b-2 border-brown-dark/30 text-brown-mid">
                  <th className="py-3 px-4 w-16">#</th>
                  <th className="py-3 px-4">NOME DO PISTOLEIRO</th>
                  <th className="py-3 px-4 text-center">VITÓRIAS</th>
                  <th className="py-3 px-4 text-center">JOGOS</th>
                  <th className="py-3 px-4 text-center">VITÓRIAS %</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr 
                    key={entry.uid} 
                    className={`
                      border-b border-brown-dark/10 hover:bg-white/40 transition-colors
                      ${entry.uid === 'user123' ? 'bg-gold/20 font-bold outline outline-2 outline-gold' : ''}
                      ${entry.rank === 1 ? 'bg-yellow-100' : ''}
                      ${entry.rank === 2 ? 'bg-gray-100' : ''}
                      ${entry.rank === 3 ? 'bg-orange-50' : ''}
                    `}
                  >
                    <td className="py-4 px-4 font-western text-2xl">
                      {entry.rank === 1 && '🥇'}
                      {entry.rank === 2 && '🥈'}
                      {entry.rank === 3 && '🥉'}
                      {entry.rank > 3 && entry.rank}
                    </td>
                    <td className="py-4 px-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brown-dark border-2 border-gold flex items-center justify-center text-xl overflow-hidden">
                        {entry.avatar === 'marshal' ? '🤠' : '🦹'}
                      </div>
                      {entry.displayName}
                    </td>
                    <td className="py-4 px-4 text-center">{entry.wins}</td>
                    <td className="py-4 px-4 text-center">{entry.totalGames}</td>
                    <td className="py-4 px-4 text-center">{entry.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
