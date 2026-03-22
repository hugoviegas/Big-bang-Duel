import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Compass, Sparkles } from "lucide-react";

const PREVIEW_MISSIONS = [
  {
    title: "Patrulha do Saloon",
    reward: "+150 Gold",
    status: "Disponível em breve",
  },
  {
    title: "Caça ao Fora da Lei",
    reward: "+1 Ruby",
    status: "Disponível em breve",
  },
  {
    title: "Treino de Mira Perfeita",
    reward: "+220 XP",
    status: "Disponível em breve",
  },
];

export default function MissionsPage() {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-5 space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-gold/35 bg-[#2b1409] shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
        <img
          src="/assets/ui/bg_saloon.webp"
          alt="Saloon"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/45 via-[#2f1407]/40 to-[#7b3515]/45" />

        <div className="relative px-5 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-black/35 px-3 py-1">
            <Compass size={14} className="text-gold" />
            <span className="font-stats text-[10px] uppercase tracking-[0.22em] text-gold/90">
              Nova área
            </span>
          </div>

          <h1 className="mt-3 font-western text-4xl text-gold text-glow-gold leading-none">
            MISSÕES
          </h1>
          <p className="mt-2 font-stats text-xs uppercase tracking-[0.17em] text-sand/80">
            Missões diárias, desafios semanais e objetivos especiais estão
            chegando.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300/45 bg-amber-300/15 px-3 py-1.5">
            <CalendarClock size={14} className="text-amber-200" />
            <span className="font-stats text-[10px] uppercase tracking-wider text-amber-100">
              Em construção
            </span>
          </div>
        </div>
      </section>

      <section className="card-wood rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-western text-lg text-gold tracking-wider">
            Prévia das missões
          </h2>
          <Sparkles size={16} className="text-gold/85" />
        </div>

        {PREVIEW_MISSIONS.map((mission) => (
          <article
            key={mission.title}
            className="rounded-xl border border-sand/25 bg-black/30 px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <h3 className="font-western text-sm text-sand-light truncate">
                {mission.title}
              </h3>
              <p className="font-stats text-[10px] uppercase tracking-wider text-sand/65 mt-0.5">
                Recompensa: {mission.reward}
              </p>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-gold/35 bg-gold/10 px-2 py-1 font-stats text-[9px] uppercase tracking-wider text-gold whitespace-nowrap">
              <CheckCircle2 size={11} />
              {mission.status}
            </span>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gold/25 bg-black/35 p-4">
        <p className="font-stats text-xs uppercase tracking-[0.15em] text-sand/70">
          Enquanto isso, continue duelando no salão online pelo menu de perfil.
        </p>
        <Link
          to="/online"
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-gold/45 bg-gold/15 px-4 py-2 font-stats text-[10px] uppercase tracking-[0.14em] text-gold hover:bg-gold/25 transition-colors"
        >
          Ir para Online
        </Link>
      </section>
    </div>
  );
}
