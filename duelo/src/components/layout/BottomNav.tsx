import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  hasEvolvableClass,
  normalizeClassMastery,
} from "../../lib/progression";
import { normalizeCurrencies } from "../../lib/progression";

const NAV_ITEMS = [
  {
    path: "/menu",
    label: "Início",
    iconSrc: "/assets/ui/nav/home.webp",
    iconAlt: "Início",
  },
  {
    path: "/characters",
    label: "Cartas",
    iconSrc: "/assets/ui/nav/cards.webp",
    iconAlt: "Cartas",
  },
  {
    path: "/missions",
    label: "Missões",
    iconSrc: "/assets/ui/nav/missions.webp",
    iconAlt: "Missões",
  },
  {
    path: "/shop",
    label: "Loja",
    iconSrc: "/assets/ui/nav/shop.webp",
    iconAlt: "Loja",
  },
  {
    path: "/leaderboard",
    label: "Ranking",
    iconSrc: "/assets/ui/nav/trophies.webp",
    iconAlt: "Ranking",
  },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get class mastery and gold from auth store, ensuring proper normalization
  const user = useAuthStore((state) => state.user);
  const classMastery = normalizeClassMastery(user?.classMastery);
  const currencies = normalizeCurrencies(user?.currencies);
  const hasEvolvable = hasEvolvableClass(classMastery, currencies.gold);

  return (
    <>
      <div className="bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;

          // Show notification dot only for Cards tab if there are evolvable classes
          const showNotification = item.path === "/characters" && hasEvolvable;

          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon" style={{ position: "relative" }}>
                <img
                  src={item.iconSrc}
                  alt={item.iconAlt}
                  className="nav-icon-image"
                  loading="lazy"
                  decoding="async"
                />
                {showNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black bg-gold" />
                )}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="safe-bottom" />
    </>
  );
}
