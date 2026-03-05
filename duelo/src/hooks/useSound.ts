import { Howl, Howler } from 'howler';
import { useRef } from 'react';

// Create singletons for game sounds so they can be triggered from anywhere
const sounds = {
  gunshot: new Howl({ src: ['/assets/audio/gunshot.mp3'], volume: 0.7 }),
  double_shot: new Howl({ src: ['/assets/audio/double_shot.mp3'], volume: 0.8 }),
  dodge: new Howl({ src: ['/assets/audio/dodge.mp3'], volume: 0.6 }),
  reload: new Howl({ src: ['/assets/audio/reload.mp3'], volume: 0.8 }),
  counter: new Howl({ src: ['/assets/audio/counter.mp3'], volume: 0.9 }),
  hit: new Howl({ src: ['/assets/audio/hit.mp3'], volume: 0.7 }),
  win: new Howl({ src: ['/assets/audio/win.mp3'], volume: 0.8 }),
  lose: new Howl({ src: ['/assets/audio/lose.mp3'], volume: 0.8 }),
  draw: new Howl({ src: ['/assets/audio/draw.mp3'], volume: 0.8 }),
  card_flip: new Howl({ src: ['/assets/audio/card_flip.mp3'], volume: 0.5 }),
  bg_music: new Howl({ src: ['/assets/audio/bg_music.mp3'], volume: 0.3, loop: true }),
};

export function useSound() {
  const isMuted = useRef(false);

  const playSound = (soundName: keyof typeof sounds) => {
    if (isMuted.current) return;
    try {
      sounds[soundName].play();
    } catch (e) {
      console.warn('Sound play failed', e);
    }
  };

  const toggleMute = () => {
    isMuted.current = !isMuted.current;
    if (isMuted.current) {
      Howler.mute(true);
    } else {
      Howler.mute(false);
    }
    return isMuted.current;
  };

  return { playSound, toggleMute, isMuted: isMuted.current };
}
