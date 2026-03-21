import { useState } from "react";
import { useSound } from "../../hooks/useSound";
import { motion } from "framer-motion";
import {
  getUIPreferences,
  setHideInfoTexts,
  setUseConfirmButton,
} from "./uiPreferences";

interface GamePauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onQuit: () => void;
}

export function GamePauseMenu({ isOpen, onClose, onQuit }: GamePauseMenuProps) {
  const { toggleMute, isMuted } = useSound();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [prefs, setPrefs] = useState(getUIPreferences());
  const [vibrationEnabled, setVibrationEnabled] = useState(
    localStorage.getItem("vibration-enabled") !== "false",
  );

  const handleVibrationToggle = () => {
    const newState = !vibrationEnabled;
    setVibrationEnabled(newState);
    localStorage.setItem("vibration-enabled", String(newState));
  };

  const handleQuitConfirm = () => {
    onQuit();
  };

  const handleInfoTextsToggle = () => {
    const next = !prefs.hideInfoTexts;
    setHideInfoTexts(next);
    setPrefs((prev) => ({ ...prev, hideInfoTexts: next }));
  };

  const handleConfirmButtonToggle = () => {
    const next = !prefs.useConfirmButton;
    setUseConfirmButton(next);
    setPrefs((prev) => ({ ...prev, useConfirmButton: next }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="p-5 md:p-6 max-w-md w-full relative rounded-2xl border border-gold/45 bg-gradient-to-b from-[#211307]/95 via-[#140b04]/95 to-black/95 shadow-[0_18px_55px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-west/60 text-sand text-xl transition-colors"
        >
          &times;
        </button>

        <h2 className="font-western text-3xl text-gold text-center mb-6 text-glow-gold">
          JOGO PAUSADO
        </h2>

        {!showQuitConfirm ? (
          <div className="space-y-4">
            {/* Sound Toggle */}
            <div className="flex justify-between items-center bg-black/35 px-4 py-3 rounded-xl border border-gold/20">
              <div>
                <span className="font-western text-sm text-sand-light tracking-wider">
                  SOM / MÚSICA
                </span>
                <p className="font-stats text-xs text-sand/50 mt-0.5">
                  {isMuted ? "Desativado" : "Ativado"}
                </p>
              </div>
              <button
                onClick={toggleMute}
                className={`w-14 h-7 rounded-full border-2 relative transition-all duration-300 ${
                  isMuted
                    ? "bg-gray-600 border-gray-500"
                    : "bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                    isMuted ? "left-1" : "left-7"
                  }`}
                />
              </button>
            </div>

            {/* Vibration Toggle */}
            <div className="flex justify-between items-center bg-black/35 px-4 py-3 rounded-xl border border-gold/20">
              <div>
                <span className="font-western text-sm text-sand-light tracking-wider uppercase">
                  VIBRAÇÃO
                </span>
                <p className="font-stats text-[10px] text-sand/50">
                  Efeitos de impacto
                </p>
              </div>
              <button
                onClick={handleVibrationToggle}
                className={`w-14 h-7 rounded-full border-2 relative transition-all duration-300 ${
                  vibrationEnabled
                    ? "bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-gray-600 border-gray-500"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                    vibrationEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between items-center bg-black/35 px-4 py-3 rounded-xl border border-gold/20">
              <div>
                <span className="font-western text-sm text-sand-light tracking-wider uppercase">
                  TEXTOS E DICAS
                </span>
                <p className="font-stats text-[10px] text-sand/50">
                  Oculta descricoes e dicas da interface
                </p>
              </div>
              <button
                onClick={handleInfoTextsToggle}
                className={`w-14 h-7 rounded-full border-2 relative transition-all duration-300 ${
                  !prefs.hideInfoTexts
                    ? "bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-gray-600 border-gray-500"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                    !prefs.hideInfoTexts ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex justify-between items-center bg-black/35 px-4 py-3 rounded-xl border border-gold/20">
              <div>
                <span className="font-western text-sm text-sand-light tracking-wider uppercase">
                  BOTAO CONFIRMAR
                </span>
                <p className="font-stats text-[10px] text-sand/50">
                  Se desativar, joga por arrastar/soltar e duplo clique
                </p>
              </div>
              <button
                onClick={handleConfirmButtonToggle}
                className={`w-14 h-7 rounded-full border-2 relative transition-all duration-300 ${
                  prefs.useConfirmButton
                    ? "bg-green-600 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                    : "bg-gray-600 border-gray-500"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                    prefs.useConfirmButton ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Quit Button */}
            <button
              onClick={() => setShowQuitConfirm(true)}
              className="w-full py-3 rounded-xl bg-red-west/20 border border-red-west/40 text-red-west font-western text-sm tracking-widest hover:bg-red-west/30 transition-all mt-6"
            >
              SAIR DO JOGO
            </button>

            {/* Continue Button */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gold/20 border border-gold/40 text-gold font-western text-sm tracking-widest hover:bg-gold/30 transition-all"
            >
              CONTINUAR
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="font-stats text-sand/80 text-center mb-6">
              Tem certeza? Sua partida será encerrada.
            </p>

            <button
              onClick={handleQuitConfirm}
              className="w-full py-3 rounded-xl bg-red-west/30 border border-red-west/50 text-red-west font-western text-sm tracking-widest hover:bg-red-west/40 transition-all"
            >
              SIM, SAIR
            </button>

            <button
              onClick={() => setShowQuitConfirm(false)}
              className="w-full py-3 rounded-xl bg-gold/20 border border-gold/40 text-gold font-western text-sm tracking-widest hover:bg-gold/30 transition-all"
            >
              CANCELAR
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
