import { useEffect, useState } from 'react';

const CRITICAL_ASSETS = [
  // Characters
  '/assets/characters/the_marshal.webp',
  '/assets/characters/the_skull.webp',
  '/assets/characters/la_dama.webp',
  
  // UI
  '/assets/ui/logo_bbd.webp',
  '/assets/ui/bg_desert_portrait.webp',
  '/assets/ui/bg_desert_landscape.webp',
  
  // Cards
  '/assets/cards/card_shoot.webp',
  '/assets/cards/card_double_shoot.webp',
  '/assets/cards/card_dodge.webp',
  '/assets/cards/card_reload.webp',
  '/assets/cards/card_counter.webp',
];

export function AssetPreloader({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let loadedCount = 0;
    const total = CRITICAL_ASSETS.length;

    if (total === 0) {
      setLoaded(true);
      return;
    }

    const onLoad = () => {
      loadedCount++;
      setProgress(Math.round((loadedCount / total) * 100));
      if (loadedCount === total) {
        // Short delay to ensure smooth transition
        setTimeout(() => setLoaded(true), 1200);
      }
    };

    CRITICAL_ASSETS.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      img.onerror = onLoad; // Count as "loaded" even on error to not block game
    });
  }, []);

  if (!loaded) {
    return (
      <div className="fixed inset-0 z-[100] bg-brown-dark flex flex-col items-center justify-center p-6 bg-[url('/assets/ui/bg_desert_portrait.webp')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
        
        <div className="relative z-10 flex flex-col items-center">
          <img 
            src="/assets/ui/logo_bbd.webp" 
            alt="Loading..." 
            className="w-48 h-auto mb-8 animate-logo-float brightness-110 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" 
          />
          
          <div className="w-64 h-3 bg-black/40 rounded-full border border-gold/30 p-0.5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold/50 to-gold rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="mt-4 font-western text-gold text-sm tracking-[0.3em] animate-pulse">
            CARREGANDO ARSENAL... {progress}%
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
