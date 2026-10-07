'use client';

/**
 * ProConnect — Son de notification
 * Génère des sons via Web Audio API (aucun fichier audio requis).
 */

// ── Types ────────────────────────────────────────────────────────────────

export type SoundId =
  | 'message_sent'
  | 'message_received'
  | 'notification'
  | 'call_ring'
  | 'call_connect'
  | 'call_end'
  | 'group_message'
  | 'like'
  | 'error';

export interface SoundPreset {
  id: string;
  label: string;
  icon: string; // emoji for display
  description: string;
}

// ── Presets catalogue ─────────────────────────────────────────────────────

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'classic',     label: 'Classique',       icon: '🔔', description: 'Son standard clair et professionnel' },
  { id: 'soft',        label: 'Doux',            icon: '🎐', description: 'Tons doux et discrets' },
  { id: 'retro',       label: 'Rétro',           icon: '📻', description: 'Style vintage rétro' },
  { id: 'modern',      label: 'Moderne',         icon: '📱', description: 'Sons modernes et élégants' },
  { id: 'nature',      label: 'Nature',          icon: '🍃', description: 'Inspiré par la nature' },
  { id: 'electronic',  label: 'Électronique',    icon: '🎹', description: 'Tons électroniques synthétisés' },
  { id: 'minimal',     label: 'Minimal',         icon: '✨', description: 'Simples et courts' },
  { id: 'friendly',    label: 'Amical',          icon: '💬', description: 'Chaleureux et amical' },
];

// ── Audio context (lazy singleton) ───────────────────────────────────────

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function gain(ctx: AudioContext, value: number, time?: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(value, time ?? ctx.currentTime);
  return g;
}

function osc(ctx: AudioContext, type: OscillatorType, freq: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  return o;
}

// ── Sound generators per preset ──────────────────────────────────────────

type SoundFn = (ctx: AudioContext, volume: number) => void;

function connectAndSchedule(source: AudioNode, ctx: AudioContext, volume: number, duration: number) {
  const masterGain = gain(ctx, volume);
  source.connect(masterGain).connect(ctx.destination);
  void (ctx.currentTime + duration); // keep reference to prevent GC
}

/* ---- CLASSIC preset ---- */
const classicSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const o = osc(ctx, 'sine', 880);
    const g = gain(ctx, vol * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    const o1 = osc(ctx, 'sine', 523);
    const o2 = osc(ctx, 'sine', 659);
    const g = gain(ctx, vol * 0.35);
    g.gain.setValueAtTime(vol * 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(t); o1.stop(t + 0.2);
    o2.start(t + 0.15); o2.stop(t + 0.4);
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(vol * 0.3, t + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.15);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = osc(ctx, 'sine', 440);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, t + i * 0.5);
      g.gain.linearRampToValueAtTime(vol * 0.3, t + i * 0.5 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.5 + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.5); o.stop(t + i * 0.5 + 0.35);
    }
  },
  call_connect(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 800);
    const g = gain(ctx, vol * 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.frequency.linearRampToValueAtTime(1200, t + 0.1);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(t + 0.3);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 600);
    const g = gain(ctx, vol * 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    [523, 587, 659].forEach((f, i) => {
      const o = osc(ctx, 'triangle', f);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(vol * 0.25, t + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.12);
    });
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 1047);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.12);
  },
  error(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'square', 200);
    const g = gain(ctx, vol * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.3);
  },
};

/* ---- SOFT preset ---- */
const softSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const o = osc(ctx, 'sine', 660);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 440);
    const g = gain(ctx, vol * 0.2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.frequency.linearRampToValueAtTime(554, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.35);
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 392);
    const g = gain(ctx, vol * 0.2);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.frequency.linearRampToValueAtTime(523, t + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.5);
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = osc(ctx, 'sine', 350);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, t + i * 0.6);
      g.gain.linearRampToValueAtTime(vol * 0.2, t + i * 0.6 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.6 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.6); o.stop(t + i * 0.6 + 0.4);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'sine', 523);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 523);
    const g = gain(ctx, vol * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'triangle', 440);
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.18, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.frequency.linearRampToValueAtTime(587, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.25);
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 880);
    const g = gain(ctx, vol * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'sine', 250);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.35);
  },
};

/* ---- RETRO preset ---- */
const retroSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const o = osc(ctx, 'square', 440);
    const g = gain(ctx, vol * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    [330, 440].forEach((f, i) => {
      const o = osc(ctx, 'square', f);
      const g = gain(ctx, vol * 0.1);
      g.gain.setValueAtTime(vol * 0.1, t + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.08);
    });
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = osc(ctx, 'square', f);
      const g = gain(ctx, vol * 0.08);
      g.gain.setValueAtTime(vol * 0.08, t + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.08);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const o = osc(ctx, 'square', 440);
      const g = gain(ctx, vol * 0.1);
      g.gain.setValueAtTime(vol * 0.1, t + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.25); o.stop(t + i * 0.25 + 0.15);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'square', 660);
    const g = gain(ctx, vol * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'square', 330);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    [392, 494].forEach((f, i) => {
      const o = osc(ctx, 'square', f);
      const g = gain(ctx, vol * 0.09);
      g.gain.setValueAtTime(vol * 0.09, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.06);
    });
  },
  like(ctx, vol) {
    const o = osc(ctx, 'square', 880);
    const g = gain(ctx, vol * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.06);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'sawtooth', 150);
    const g = gain(ctx, vol * 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
  },
};

/* ---- MODERN preset ---- */
const modernSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 1200);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.12);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 600);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.3);
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [700, 900, 1100].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.2, t + i * 0.1 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.12);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = osc(ctx, 'sine', 1000);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.2, t + i * 0.4 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.4 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.4); o.stop(t + i * 0.4 + 0.25);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'sine', 1000);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 800);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'triangle', 800);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.2);
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 1400);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.1, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'sawtooth', 200);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.2);
  },
};

/* ---- NATURE preset ---- */
const natureSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    // gentle water drop
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 1200);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.25);
  },
  message_received(ctx, vol) {
    // bird chirp
    const t = ctx.currentTime;
    [1800, 2200, 2600].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.12, t + i * 0.08 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.06);
    });
  },
  notification(ctx, vol) {
    // wind chime
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 784].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.15, t + i * 0.1 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.2);
    });
  },
  call_ring(ctx, vol) {
    // gentle bell
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const o = osc(ctx, 'sine', 800);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.2, t + i * 0.5 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.5 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.5); o.stop(t + i * 0.5 + 0.4);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'sine', 1000);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.5);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 600);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.15, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    [784, 659, 523].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.12, t + i * 0.1 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.12);
    });
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 1500);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.08, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.1);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'triangle', 200);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
  },
};

/* ---- ELECTRONIC preset ---- */
const electronicSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sawtooth', 200);
    const g = gain(ctx, vol * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(100, t + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.08);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    [300, 400, 500].forEach((f, i) => {
      const o = osc(ctx, 'sawtooth', f);
      const g = gain(ctx, vol * 0.1);
      g.gain.setValueAtTime(vol * 0.1, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.05);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.05);
    });
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [200, 300, 400, 500, 600].forEach((f, i) => {
      const o = osc(ctx, 'sawtooth', f);
      const g = gain(ctx, vol * 0.08);
      g.gain.setValueAtTime(vol * 0.08, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.04);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.04);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = osc(ctx, 'square', 440);
      const g = gain(ctx, vol * 0.12);
      g.gain.setValueAtTime(vol * 0.12, t + i * 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.3); o.stop(t + i * 0.3 + 0.2);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'sawtooth', 600);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sawtooth', 400);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    [250, 350, 450].forEach((f, i) => {
      const o = osc(ctx, 'triangle', f);
      const g = gain(ctx, vol * 0.1);
      g.gain.setValueAtTime(vol * 0.1, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.04);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.04);
    });
  },
  like(ctx, vol) {
    const o = osc(ctx, 'square', 800);
    const g = gain(ctx, vol * 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.05);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'sawtooth', 100);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.3);
  },
};

/* ---- MINIMAL preset ---- */
const minimalSounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const o = osc(ctx, 'sine', 1000);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.04);
  },
  message_received(ctx, vol) {
    const o = osc(ctx, 'sine', 800);
    const g = gain(ctx, vol * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.06);
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [600, 800].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, vol * 0.18);
      g.gain.setValueAtTime(vol * 0.18, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.06);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.06);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = osc(ctx, 'sine', 700);
      const g = gain(ctx, vol * 0.2);
      g.gain.setValueAtTime(vol * 0.2, t + i * 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.3 + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.3); o.stop(t + i * 0.3 + 0.15);
    }
  },
  call_connect(ctx, vol) {
    const o = osc(ctx, 'sine', 900);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 500);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.1);
  },
  group_message(ctx, vol) {
    const o = osc(ctx, 'sine', 900);
    const g = gain(ctx, vol * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.05);
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 1200);
    const g = gain(ctx, vol * 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.03);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'sine', 200);
    const g = gain(ctx, vol * 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.15);
  },
};

/* ---- FRIENDLY preset ---- */
const friendlySounds: Record<SoundId, SoundFn> = {
  message_sent(ctx, vol) {
    const t = ctx.currentTime;
    const o = osc(ctx, 'sine', 523);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.2, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.15);
  },
  message_received(ctx, vol) {
    const t = ctx.currentTime;
    [392, 494, 587, 784].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.18, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.1);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.1);
    });
  },
  notification(ctx, vol) {
    const t = ctx.currentTime;
    [523, 659, 784, 1047, 784, 659].forEach((f, i) => {
      const o = osc(ctx, 'triangle', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.15, t + i * 0.07 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.08);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.08);
    });
  },
  call_ring(ctx, vol) {
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = osc(ctx, 'sine', 523);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.2, t + i * 0.4 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.4 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.4); o.stop(t + i * 0.4 + 0.3);
    }
  },
  call_connect(ctx, vol) {
    const t = ctx.currentTime;
    [523, 659, 784].forEach((f, i) => {
      const o = osc(ctx, 'sine', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.15, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.1);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.08); o.stop(t + i * 0.08 + 0.1);
    });
  },
  call_end(ctx, vol) {
    const o = osc(ctx, 'sine', 440);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.frequency.linearRampToValueAtTime(330, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
  },
  group_message(ctx, vol) {
    const t = ctx.currentTime;
    [440, 554, 659].forEach((f, i) => {
      const o = osc(ctx, 'triangle', f);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(vol * 0.15, t + i * 0.07 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.08);
      o.connect(g).connect(ctx.destination);
      o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.08);
    });
  },
  like(ctx, vol) {
    const o = osc(ctx, 'sine', 1047);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.08);
  },
  error(ctx, vol) {
    const o = osc(ctx, 'triangle', 220);
    const g = gain(ctx, 0);
    g.gain.linearRampToValueAtTime(vol * 0.12, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
  },
};

// ── Preset map ────────────────────────────────────────────────────────────

const PRESET_MAP: Record<string, Record<SoundId, SoundFn>> = {
  classic: classicSounds,
  soft: softSounds,
  retro: retroSounds,
  modern: modernSounds,
  nature: natureSounds,
  electronic: electronicSounds,
  minimal: minimalSounds,
  friendly: friendlySounds,
};

// ── Public API ────────────────────────────────────────────────────────────

/** Play a notification sound. Respects user preferences from store. */
export function playSound(soundId: SoundId, presetId?: string, volume?: number): void {
  try {
    // Read from localStorage if not provided
    const pid = presetId ?? (typeof window !== 'undefined' ? localStorage.getItem('pc_sound_preset') : null) ?? 'classic';
    const vol = volume ?? (typeof window !== 'undefined' ? Number(localStorage.getItem('pc_sound_volume')) || 0.7 : 0.7);
    const enabled = typeof window !== 'undefined' ? localStorage.getItem('pc_sound_enabled') !== 'false' : true;

    if (!enabled) return;

    const preset = PRESET_MAP[pid] ?? PRESET_MAP['classic'];
    const fn = preset[soundId] ?? preset['notification'];
    fn(getCtx(), vol);
  } catch {
    // Silently fail — audio may not be available
  }
}

/** Get human-readable labels for sound IDs */
export const SOUND_LABELS: Record<SoundId, string> = {
  message_sent: 'Message envoyé',
  message_received: 'Message reçu',
  notification: 'Notification',
  call_ring: 'Sonnerie d\'appel',
  call_connect: 'Appel connecté',
  call_end: 'Appel terminé',
  group_message: 'Message de groupe',
  like: 'J\'aime',
  error: 'Erreur',
};

/** All sound IDs for iteration */
export const ALL_SOUND_IDS: SoundId[] = [
  'message_sent',
  'message_received',
  'notification',
  'call_ring',
  'call_connect',
  'call_end',
  'group_message',
  'like',
  'error',
];
