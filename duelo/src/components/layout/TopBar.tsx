import { useState } from "react";
import { Settings } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { getCharacter, resolveAvatarPicture } from "../../lib/characters";
import { SettingsModal } from "../common/SettingsModal";
import { ProfileDropdown } from "./ProfileDropdown";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!user) return null;

  const activeChar = getCharacter(user.avatar ?? "marshal");
  const avatarPic = resolveAvatarPicture(
    user.avatar ?? "marshal",
    user.avatarPicture,
  );
  const level = 1; // TODO: derive from actual XP/level system
  const xpCurrent = 0;
  const xpMax = 100;
  const xpPercent = xpMax > 0 ? Math.min((xpCurrent / xpMax) * 100, 100) : 0;
  const coins = 0; // TODO: integrate with actual coin system

  const toggleDropdown = () => setIsDropdownOpen((v) => !v);
  const closeDropdown = () => setIsDropdownOpen(false);

  return (
    <>
      <div className="top-bar">
        {/* Avatar */}
        <button className="avatar-ring" onClick={toggleDropdown}>
          <img
            src={avatarPic}
            alt={activeChar.name}
            className="w-full h-full object-cover"
          />
        </button>

        {/* Profile Info */}
        <div className="profile-info">
          <div className="profile-name-row">
            <span className="profile-name">{user.displayName}</span>
            <span className="level-badge">Nv {level}</span>
          </div>
          <div className="xp-row">
            <div className="xp-bar-bg">
              <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
            </div>
            <span className="xp-text">
              {xpCurrent} / {xpMax} XP
            </span>
          </div>
        </div>

        {/* Coins */}
        <div className="coins-pill">
          <span
            className="text-lg"
            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
          >
            🪙
          </span>
          <span className="coins-amount">{coins.toLocaleString("pt-BR")}</span>
        </div>

        {/* Settings */}
        <button
          className="settings-btn"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings size={18} className="text-[#f5e6c8]" />
        </button>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="overlay show" onClick={closeDropdown} />
      )}
      <ProfileDropdown
        isOpen={isDropdownOpen}
        onClose={closeDropdown}
        onSettingsClick={() => {
          closeDropdown();
          setIsSettingsOpen(true);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
