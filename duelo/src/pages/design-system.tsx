import { useNavigate } from "react-router-dom";

/**
 * Design System Components Showcase
 * Demonstra todos os componentes e estilos padrão do Big Bang Duel
 */
export default function DesignSystemPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
          DESIGN SYSTEM
        </h1>
        <p className="text-center font-stats text-sm text-sand/50 mb-8">
          Guia Visual de Componentes
        </p>

        {/* Cores */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">🎨 Cores</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ColorSwatch
              name="Gold"
              color="bg-gold"
              textColor="text-brown-dark"
            />
            <ColorSwatch
              name="Sand"
              color="bg-sand"
              textColor="text-brown-dark"
            />
            <ColorSwatch
              name="Sand Light"
              color="bg-sand-light"
              textColor="text-brown-dark"
            />
            <ColorSwatch
              name="Parchment"
              color="bg-parchment"
              textColor="text-brown-dark"
            />
            <ColorSwatch
              name="Brown Dark"
              color="bg-brown-dark"
              textColor="text-sand-light"
            />
            <ColorSwatch
              name="Brown Mid"
              color="bg-brown-mid"
              textColor="text-sand-light"
            />
            <ColorSwatch
              name="Red West"
              color="bg-red-west"
              textColor="text-sand-light"
            />
            <ColorSwatch
              name="Sky"
              color="bg-sky"
              textColor="text-brown-dark"
            />
          </div>
        </section>

        {/* Botões */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">🎯 Botões</h2>
          <div className="space-y-3 max-w-md mx-auto">
            <button className="btn-western">BOTÃO PADRÃO</button>
            <button className="btn-western btn-danger">BOTÃO DANGER</button>
            <button className="btn-western btn-sky">BOTÃO SKY</button>
            <button className="btn-western" disabled>
              BOTÃO DESABILITADO
            </button>
          </div>
        </section>

        {/* Inputs */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">✍️ Inputs</h2>
          <div className="space-y-3 max-w-md mx-auto">
            <input
              type="text"
              className="input-parchment"
              placeholder="Input Parchment padrão..."
            />
            <input
              type="text"
              className="input-parchment"
              placeholder="Nome de usuário"
            />
          </div>
        </section>

        {/* Cards */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">🃏 Cards</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Card Wood */}
            <div className="card-wood p-6 rounded-2xl">
              <h3 className="font-western text-xl text-gold mb-2">Card Wood</h3>
              <p className="font-stats text-sm text-sand-light/80">
                Card com textura de madeira para painéis principais e modais.
              </p>
            </div>

            {/* Card Transparente */}
            <div className="bg-black/30 backdrop-blur-sm border-2 border-sand/20 rounded-xl p-6">
              <h3 className="font-western text-xl text-gold mb-2">
                Card Transparente
              </h3>
              <p className="font-stats text-sm text-sand-light/80">
                Card com fundo escuro semi-transparente para overlays.
              </p>
            </div>
          </div>
        </section>

        {/* Tipografia */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">
            🔤 Tipografia
          </h2>
          <div className="space-y-4 bg-black/20 backdrop-blur-sm p-6 rounded-xl border border-sand/10">
            <div>
              <p className="font-western text-4xl text-gold text-glow-gold">
                Título Principal
              </p>
              <code className="text-xs text-sand/60 font-mono">
                font-western text-4xl text-gold text-glow-gold
              </code>
            </div>
            <div>
              <p className="font-western text-2xl text-sand-light">
                Título Secundário
              </p>
              <code className="text-xs text-sand/60 font-mono">
                font-western text-2xl text-sand-light
              </code>
            </div>
            <div>
              <p className="font-stats text-base text-sand-light">
                Corpo de texto padrão para conteúdo
              </p>
              <code className="text-xs text-sand/60 font-mono">
                font-stats text-base text-sand-light
              </code>
            </div>
            <div>
              <p className="font-stats text-sm text-brown-mid">
                Texto secundário menor
              </p>
              <code className="text-xs text-sand/60 font-mono">
                font-stats text-sm text-brown-mid
              </code>
            </div>
            <div>
              <p className="font-mono text-xs text-sand/40 tracking-widest">
                #A1B2C3D4
              </p>
              <code className="text-xs text-sand/60 font-mono">
                font-mono text-xs text-sand/40 tracking-widest
              </code>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">🏷️ Badges</h2>
          <div className="flex flex-wrap gap-3 bg-black/20 backdrop-blur-sm p-6 rounded-xl border border-sand/10">
            <span className="px-3 py-1 rounded-full border border-gray-400 text-gray-300 text-xs font-stats uppercase tracking-widest bg-black/60">
              Comum
            </span>
            <span className="px-3 py-1 rounded-full border border-sky text-sky text-xs font-stats uppercase tracking-widest bg-black/60">
              Raro
            </span>
            <span className="px-3 py-1 rounded-full border border-gold text-gold text-xs font-stats uppercase tracking-widest bg-black/60">
              Lendário
            </span>
            <span className="font-stats text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">
              VOCÊ
            </span>
            <span className="font-stats text-[9px] text-red-west bg-red-west/10 px-1.5 py-0.5 rounded">
              NOVO
            </span>
          </div>
        </section>

        {/* Efeitos */}
        <section className="mb-12">
          <h2 className="font-western text-2xl text-gold mb-4">✨ Efeitos</h2>
          <div className="space-y-4 bg-black/20 backdrop-blur-sm p-6 rounded-xl border border-sand/10">
            <div>
              <p className="font-western text-2xl text-gold text-glow-gold">
                Texto com brilho dourado
              </p>
              <code className="text-xs text-sand/60 font-mono">
                text-glow-gold
              </code>
            </div>
            <div>
              <p className="font-western text-xl text-sand-light drop-shadow-2xl">
                Texto com sombra forte
              </p>
              <code className="text-xs text-sand/60 font-mono">
                drop-shadow-2xl
              </code>
            </div>
            <div>
              <div className="w-32 h-32 bg-brown-mid rounded-lg animate-pulse mx-auto" />
              <code className="text-xs text-sand/60 font-mono text-center block mt-2">
                animate-pulse
              </code>
            </div>
          </div>
        </section>

        {/* Botão Voltar */}
        <button
          onClick={() => navigate("/menu")}
          className="btn-western btn-danger mt-8 max-w-xs mx-auto"
        >
          VOLTAR AO MENU
        </button>
      </div>
    </div>
  );
}

// Component auxiliar para mostrar cores
function ColorSwatch({
  name,
  color,
  textColor,
}: {
  name: string;
  color: string;
  textColor: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`${color} h-20 rounded-lg border-2 border-brown-dark mb-2`}
      />
      <p className={`font-stats text-xs ${textColor}`}>{name}</p>
    </div>
  );
}
