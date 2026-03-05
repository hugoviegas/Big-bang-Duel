import { useNavigate } from 'react-router-dom';

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'Billy The Kid', avatar: 'marshal', wins: 47, totalGames: 52, winRate: 90.4 },
  { rank: 2, name: 'El Diablo', avatar: 'skull', wins: 41, totalGames: 50, winRate: 82.0 },
  { rank: 3, name: 'La Dama Roja', avatar: 'la_dama', wins: 38, totalGames: 48, winRate: 79.2 },
  { rank: 4, name: 'Dusty Dan', avatar: 'marshal', wins: 32, totalGames: 45, winRate: 71.1 },
  { rank: 5, name: 'Cactus Jack', avatar: 'skull', wins: 28, totalGames: 42, winRate: 66.7 },
  { rank: 6, name: 'Pistoleiro X', avatar: 'marshal', wins: 25, totalGames: 40, winRate: 62.5 },
  { rank: 7, name: 'Rattlesnake', avatar: 'la_dama', wins: 22, totalGames: 38, winRate: 57.9 },
  { rank: 8, name: 'Dead Eye', avatar: 'skull', wins: 20, totalGames: 36, winRate: 55.6 },
  { rank: 9, name: 'Tumbleweed', avatar: 'marshal', wins: 18, totalGames: 35, winRate: 51.4 },
  { rank: 10, name: 'Rookie', avatar: 'la_dama', wins: 15, totalGames: 34, winRate: 44.1 },
];

const AVATAR_IMAGES: Record<string, string> = {
  marshal: '/assets/characters/the_marshal.png',
  skull: '/assets/characters/the_skull.png',
  la_dama: '/assets/characters/la_dama.png',
};

const RANK_STYLES: Record<number, string> = {
  1: 'border-yellow-400 bg-yellow-400/10',
  2: 'border-gray-300 bg-gray-300/10',
  3: 'border-orange-400 bg-orange-400/10',
};

const RANK_BADGES: Record<number, string> = {
  1: 'OURO',
  2: 'PRATA',
  3: 'BRONZE',
};

export function Leaderboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.png')] md:bg-[url('/assets/ui/bg_desert_landscape.png')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto p-4 py-8">
        <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">RANKING</h1>
        <p className="text-center font-stats text-sm text-sand/50 mb-6">Top Pistoleiros do Velho Oeste</p>

        {/* Leaderboard Table */}
        <div className="space-y-2">
          {MOCK_LEADERBOARD.map((entry, i) => (
            <div 
              key={entry.rank}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 backdrop-blur-sm transition-all animate-fade-up ${
                RANK_STYLES[entry.rank] || 'border-sand/10 bg-black/30'
              }`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Rank */}
              <div className={`w-8 h-8 flex items-center justify-center rounded-full font-western text-sm shrink-0 ${
                entry.rank <= 3 ? 'bg-gold/20 text-gold' : 'bg-black/30 text-sand/60'
              }`}>
                {entry.rank}
              </div>

              {/* Avatar */}
              <img 
                src={AVATAR_IMAGES[entry.avatar] || AVATAR_IMAGES.marshal} 
                alt="" 
                className="w-10 h-10 object-contain shrink-0 drop-shadow-md" 
              />

              {/* Name + Badge */}
              <div className="flex-1 min-w-0">
                <div className="font-western text-sm text-sand-light tracking-wider truncate">{entry.name}</div>
                {RANK_BADGES[entry.rank] && (
                  <span className={`font-stats text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    entry.rank === 1 ? 'bg-yellow-400/20 text-yellow-400' :
                    entry.rank === 2 ? 'bg-gray-300/20 text-gray-300' :
                    'bg-orange-400/20 text-orange-400'
                  }`}>
                    {RANK_BADGES[entry.rank]}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className="font-stats text-sm font-bold text-gold">{entry.wins} V</div>
                <div className="font-stats text-[10px] text-sand/50">{entry.winRate}%</div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => navigate('/menu')}
          className="btn-western btn-danger mt-8 max-w-xs mx-auto"
        >
          VOLTAR AO MENU
        </button>
      </div>
    </div>
  );
}
