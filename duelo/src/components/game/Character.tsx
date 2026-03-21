import { motion } from "framer-motion";
import { getCharacterImage } from "../../lib/characters";
import type { PlayerState } from "../../types";

interface CharacterProps {
  player: PlayerState;
  isRight?: boolean;
}

const charVariants = {
  idle: {
    y: [0, -6, 0],
    transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" as const },
  },
  shoot: { x: [0, 15, 0], scale: [1, 1.05, 1], transition: { duration: 0.3 } },
  dodge: {
    x: [0, -50, 0],
    y: [0, -20, 0],
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
  reload: {
    rotate: [0, -8, 0],
    scale: [1, 0.95, 1],
    transition: { duration: 0.5 },
  },
  hit: { x: [0, -15, 12, -8, 0], transition: { duration: 0.4 } },
  death: {
    y: [0, 80],
    opacity: [1, 0.3, 0],
    rotate: [0, 15],
    transition: { duration: 0.8 },
  },
  counter: { scale: [1, 1.2, 0.95, 1.1, 1], transition: { duration: 0.5 } },
};

export function Character({ player, isRight = false }: CharacterProps) {
  const imgSrc = getCharacterImage(player.avatar);

  return (
    <div
      className={`relative flex flex-col items-center justify-end ${isRight ? "translate-x-0.5 md:translate-x-1" : "-translate-x-0.5 md:-translate-x-1"}`}
    >
      <motion.img
        key={player.avatar + "-" + player.life}
        src={imgSrc}
        alt={player.displayName}
        variants={charVariants}
        animate={player.currentAnimation}
        initial="idle"
        className="w-[42vw] max-w-[188px] sm:max-w-[230px] md:max-w-[275px] lg:max-w-[320px] aspect-[3/4] object-cover rounded-md filter drop-shadow-2xl z-10"
      />
      {/* Shadow under character */}
      <div className="w-[23vw] max-w-[110px] h-2 sm:h-3 bg-black/30 rounded-full blur-sm -mt-1 sm:-mt-2" />
    </div>
  );
}
