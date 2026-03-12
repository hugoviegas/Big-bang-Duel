import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wand2, Users, Store, Trophy, History } from "lucide-react";

const NAV_ITEMS = [
  { path: "/menu", icon: "home", label: "Home" },
  { path: "/characters", icon: "cards", label: "Cards" },
  { path: "/online", icon: "users", label: "Online" },
  { path: "/match-history", icon: "history", label: "Histórico" },
  { path: "/leaderboard", icon: "trophy", label: "Ranking" },
];

const getIconComponent = (iconName: string) => {
  const iconMap = {
    home: Home,
    cards: Wand2,
    users: Users,
    shop: Store,
    trophy: Trophy,
    history: History,
  };
  return iconMap[iconName as keyof typeof iconMap] || Home;
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <div className="bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = getIconComponent(item.icon);

          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">
                <IconComponent size={24} strokeWidth={1.5} />
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
