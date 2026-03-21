import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wand2, Users, Store, Trophy } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { hasEvolvableClass, normalizeClassMastery } from "../../lib/progression";
import { normalizeCurrencies } from "../../lib/progression";

const NAV_ITEMS = [
  { path: "/menu", icon: "home", label: "Home" },
  { path: "/characters", icon: "cards", label: "Cards" },
  { path: "/online", icon: "users", label: "Online" },
  { path: "/shop", icon: "shop", label: "Loja" },
  { path: "/leaderboard", icon: "trophy", label: "Ranking" },
];

const getIconComponent = (iconName: string) => {
  const iconMap = {
    home: Home,
    cards: Wand2,
    users: Users,
    shop: Store,
    trophy: Trophy,
  };
  return iconMap[iconName as keyof typeof iconMap] || Home;
};

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
          const IconComponent = getIconComponent(item.icon);
          
          // Show notification dot only for Cards tab if there are evolvable classes
          const showNotification = item.path === "/characters" && hasEvolvable;

          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon" style={{ position: "relative" }}>
                <IconComponent size={24} strokeWidth={1.5} />
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
