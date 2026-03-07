import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getCharacter, getAvatarCrop } from "../../lib/characters";
import { Edit, Settings, LogOut } from "lucide-react";

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

  if (!user) return null;

  const activeChar = getCharacter(user.avatar ?? "marshal");
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
          <img
            src={activeChar.image}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: getAvatarCrop(user.avatar ?? "marshal") }}
          />
        </div>
        <div>
          <div className="dropdown-name">{user.displayName}</div>
          <div className="dropdown-id">
            {playerCode ? `#${playerCode}` : ""}
          </div>
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
      <div className="dropdown-item danger" onClick={handleLogout}>
        <LogOut size={20} className="dropdown-item-icon" />
        <span className="dropdown-item-text">Sair</span>
      </div>
    </div>
  );
}
