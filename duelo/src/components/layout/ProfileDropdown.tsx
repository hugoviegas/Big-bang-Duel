import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { resolveAvatarPicture } from "../../lib/characters";
import { Edit, Settings, LogOut, Heart, Trophy } from "lucide-react";
import { useFriendsStore } from "../../store/friendsStore";

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
        <div className="dropdown-avatar">
          <img src={avatarPic} alt="" className="w-full h-full object-cover" />
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
        <span className="dropdown-item-text">Conquistas</span>
      </div>
      <div className="dropdown-item danger" onClick={handleLogout}>
        <LogOut size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Sair</span>
      </div>
    </div>
  );
}
