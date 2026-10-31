// Beeps and buzzes, so door staff know the result without reading the screen.
import { useEffect, useState } from 'react';

let audio: AudioContext | null = null;
let soundEnabled = readSound();

function readSound(): boolean {
  try {
    return localStorage.getItem('jazba-scan-sound') !== 'off';
  } catch {
    return true;
  }
}

export function isSoundOn(): boolean {
  return soundEnabled;
}

export function setSoundOn(on: boolean): void {
  soundEnabled = on;
  try {
    localStorage.setItem('jazba-scan-sound', on ? 'on' : 'off');
  } catch {
    // sound setting just won't be remembered
  }
}

/** Phones only allow sound after a tap, so call this from one. */
export function unlockAudio(): void {
  try {
    if (!audio) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio?.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

function tone(freq: number, start: number, length: number, type: OscillatorType, volume: number) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

/** beep: a ticket was read · ok: checked in · warn: look closer · bad: stop. */
export type Feedback = 'beep' | 'ok' | 'bad' | 'warn';

export function feedback(kind: Feedback): void {
  try {
    navigator.vibrate?.(kind === 'bad' ? [140, 70, 140, 70, 140] : kind === 'warn' ? [90, 60, 90] : 70);
  } catch {
    // no vibration on this phone
  }
  if (!soundEnabled || !audio) return;
  const t = audio.currentTime + 0.01;
  if (kind === 'beep') {
    tone(1046, t, 0.12, 'sine', 0.25);
  } else if (kind === 'ok') {
    tone(880, t, 0.1, 'sine', 0.25);
    tone(1320, t + 0.11, 0.16, 'sine', 0.25);
  } else if (kind === 'warn') {
    tone(560, t, 0.12, 'triangle', 0.3);
    tone(560, t + 0.18, 0.12, 'triangle', 0.3);
  } else {
    tone(200, t, 0.2, 'square', 0.12);
    tone(160, t + 0.24, 0.3, 'square', 0.12);
  }
}

/** Handheld USB/Bluetooth barcode scanners "type" the code and press Enter.
 *  Catch that anywhere on the page (except while a text box is in use). */
export function useScannerKeyboard(onCode: (code: string) => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let buffer = '';
    let lastKey = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const now = performance.now();
      if (now - lastKey > 100) buffer = '';
      lastKey = now;
      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          onCode(buffer);
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCode, enabled]);
}

/** Chrome's "install this app" prompt, plus whether we're already installed. */
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true,
  );
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => {
      setPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    setPrompt(null);
  };
  return { installed, canPrompt: !!prompt, install, ios };
}
