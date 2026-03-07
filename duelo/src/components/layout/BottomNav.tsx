import { useLocation, useNavigate } from "react-router-dom";
import { Home, Wand2, Users, Heart, Trophy } from "lucide-react";
import { useFriendsStore } from "../../store/friendsStore";

const NAV_ITEMS = [
  { path: "/menu", icon: "home", label: "Home" },
  { path: "/characters", icon: "cards", label: "Cards" },
  { path: "/online", icon: "users", label: "Online" },
  { path: "/friends", icon: "heart", label: "Amigos" },
  { path: "/leaderboard", icon: "trophy", label: "Ranking" },
];

const getIconComponent = (iconName: string) => {
  const iconMap = {
    home: Home,
    cards: Wand2,
    users: Users,
    heart: Heart,
    trophy: Trophy,
  };
  return iconMap[iconName as keyof typeof iconMap] || Home;
};

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingRequests = useFriendsStore((s) => s.pendingRequests);

  return (
    <>
      <div className="bottom-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const hasBadge =
            item.path === "/friends" && pendingRequests.length > 0;
          const IconComponent = getIconComponent(item.icon);

          return (
            <button
              key={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {hasBadge && (
                <span className="nav-badge">
                  <span className="badge-content">{pendingRequests.length}</span>
                </span>
              )}
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
