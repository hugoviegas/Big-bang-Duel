import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { resolveAvatarPicture } from "../../lib/characters";
import { Edit, Settings, LogOut, Heart, Trophy, History } from "lucide-react";
import { useFriendsStore } from "../../store/friendsStore";
import { ACHIEVEMENTS, normalizeAchievements } from "../../lib/achievements";

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
}

export function ProfileDropdown({
  isOpen,
  onClose,
  onSettingsClick,
}: ProfileDropdownProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const pendingRequests = useFriendsStore((s) => s.pendingRequests);

  if (!user) return null;

  const avatarPic = resolveAvatarPicture(
    user.avatar ?? "marshal",
    user.avatarPicture,
  );
  const playerCode = user.playerCode ?? "";

  // Count unclaimed achievement rewards
  const allProgress = normalizeAchievements(user.achievements ?? {});
  const unclaimedCount = ACHIEVEMENTS.reduce((n, def) => {
    const p = allProgress[def.id];
    return n + (p && p.level > p.claimedLevel ? 1 : 0);
  }, 0);

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate("/");
  };

  return (
    <div className={`profile-dropdown ${isOpen ? "open" : ""}`}>
      <div className="dropdown-header">
        <div className="dropdown-avatar relative">
          <img src={avatarPic} alt="" />
          {unclaimedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full ring-2 ring-black" />
          )}
        </div>
        <div>
          <div className="dropdown-name">{user.displayName}</div>
          <div className="dropdown-id">{playerCode || ""}</div>
        </div>
      </div>
      <div className="dropdown-item" onClick={() => handleNav("/profile")}>
        <Edit size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Editar Perfil</span>
      </div>
      <div className="dropdown-item" onClick={onSettingsClick}>
        <Settings size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Configurações</span>
      </div>
      <div className="dropdown-item" onClick={() => handleNav("/friends")}>
        <Heart size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">
          Amigos
          {pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
        </span>
      </div>
      <div className="dropdown-item" onClick={() => handleNav("/achievements")}>
        <Trophy size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text flex items-center">
          Conquistas
          {unclaimedCount > 0 && (
            <span className="ml-2 w-3 h-3 bg-red-600 rounded-full inline-block ring-2 ring-black animate-pulse" />
          )}
        </span>
      </div>
      <div
        className="dropdown-item"
        onClick={() => handleNav("/match-history")}
      >
        <History size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Histórico de Partidas</span>
      </div>
      <div className="dropdown-item danger" onClick={handleLogout}>
        <LogOut size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Sair</span>
      </div>
    </div>
  );
}
