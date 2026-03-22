import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getCharacter, resolveAvatarPicture } from "../../lib/characters";
import { SettingsModal } from "../common/SettingsModal";
import { ProfileDropdown } from "./ProfileDropdown";
import {
  calculateProgression,
  normalizeCurrencies,
  normalizeRanked,
} from "../../lib/progression";
import { ACHIEVEMENTS, normalizeAchievements } from "../../lib/achievements";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const navigate = useNavigate();

  if (!user) return null;

  const activeChar = getCharacter(user.avatar ?? "marshal");
  const avatarPic = resolveAvatarPicture(
    user.avatar ?? "marshal",
    user.avatarPicture,
  );
  const progression = calculateProgression(user.progression?.xpTotal ?? 0);
  const currencies = normalizeCurrencies(user.currencies);
  const ranked = normalizeRanked(user.ranked);
  const level = progression.level;
  const coins = currencies.gold;
  const rubies = currencies.ruby;

  const toggleDropdown = () => setIsDropdownOpen((v) => !v);
  const closeDropdown = () => setIsDropdownOpen(false);

  // Count unclaimed achievement rewards for header indicator
  const allProgress = normalizeAchievements(user.achievements ?? {});
  const headerUnclaimed = ACHIEVEMENTS.reduce((n, def) => {
    const p = allProgress[def.id];
    return n + (p && p.level > p.claimedLevel ? 1 : 0);
  }, 0);

  return (
    <>
      <div className="top-bar">
        {/* Avatar */}
        <button className="avatar-ring" onClick={toggleDropdown}>
          <img src={avatarPic} alt={activeChar.name} />
          {headerUnclaimed > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full ring-2 ring-black animate-pulse shadow-[0_0_8px_#ff0000]" />
          )}
        </button>

        {/* Profile Info */}
        <div className="profile-info">
          <span
            className="profile-name cursor-pointer hover:text-gold transition-colors"
            onClick={() => navigate("/profile")}
          >
            {user.displayName}
          </span>
          <span className="profile-level">Nv {level}</span>
        </div>

        {/* Gold */}
        <div className="coins-pill">
          <picture className="inline-block align-middle">
            <source srcSet="/assets/ui/gold_coin.webp" type="image/webp" />
            <img
              src="/assets/ui/png/gold_coin.png"
              alt="gold"
              className="w-6 h-6 inline-block"
            />
          </picture>
          <span className="coins-amount">{coins.toLocaleString("pt-BR")}</span>
        </div>

        {/* Ruby */}
        <div className="coins-pill">
          <picture className="inline-block align-middle">
            <source srcSet="/assets/ui/ruby_coin.webp" type="image/webp" />
            <img
              src="/assets/ui/png/ruby_coin.png"
              alt="ruby"
              className="w-6 h-6 inline-block"
            />
          </picture>
          <span className="coins-amount">{rubies.toLocaleString("pt-BR")}</span>
        </div>

        {/* Trophies */}
        <div className="coins-pill" title="Troféus online">
          <picture className="inline-block align-middle">
            <source srcSet="/assets/ui/trophie_icon.webp" type="image/webp" />
            <img
              src="/assets/ui/png/trophie_icon.png"
              alt="trophy"
              className="w-6 h-6 inline-block"
            />
          </picture>
          <span className="coins-amount">
            {ranked.trophies.toLocaleString("pt-BR")}
          </span>
        </div>
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
