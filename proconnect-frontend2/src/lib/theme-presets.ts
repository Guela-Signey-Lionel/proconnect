export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  secondary: string;
  secondaryForeground: string;
  preview: string; // a CSS gradient for the preview swatch
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sky',
    label: 'Bleu Nuit',
    description: 'Le thème par défaut de ProConnect',
    primary: '#2f5496',
    primaryForeground: '#ffffff',
    accent: '#dbe4f6',
    accentForeground: '#142646',
    secondary: '#eef2fb',
    secondaryForeground: '#1d3461',
    preview: 'linear-gradient(135deg, #0d1a30, #2f5496)',
  },
  {
    id: 'emerald',
    label: 'Émeraude',
    description: 'Fraîcheur et nature',
    primary: '#10b981',
    primaryForeground: '#ffffff',
    accent: '#a7f3d0',
    accentForeground: '#064e3b',
    secondary: '#d1fae5',
    secondaryForeground: '#065f46',
    preview: 'linear-gradient(135deg, #10b981, #34d399)',
  },
  {
    id: 'violet',
    label: 'Violet',
    description: 'Élégance et créativité',
    primary: '#8b5cf6',
    primaryForeground: '#ffffff',
    accent: '#ddd6fe',
    accentForeground: '#4c1d95',
    secondary: '#ede9fe',
    secondaryForeground: '#5b21b6',
    preview: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  },
  {
    id: 'rose',
    label: 'Rose',
    description: 'Chaleur et convivialité',
    primary: '#f43f5e',
    primaryForeground: '#ffffff',
    accent: '#fecdd3',
    accentForeground: '#881337',
    secondary: '#ffe4e6',
    secondaryForeground: '#9f1239',
    preview: 'linear-gradient(135deg, #f43f5e, #fb7185)',
  },
  {
    id: 'amber',
    label: 'Ambre',
    description: 'Énergie et optimisme',
    primary: '#f59e0b',
    primaryForeground: '#ffffff',
    accent: '#fde68a',
    accentForeground: '#78350f',
    secondary: '#fef3c7',
    secondaryForeground: '#92400e',
    preview: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  },
  {
    id: 'teal',
    label: 'Sarcelle',
    description: 'Sérénité et équilibre',
    primary: '#14b8a6',
    primaryForeground: '#ffffff',
    accent: '#99f6e4',
    accentForeground: '#134e4a',
    secondary: '#ccfbf1',
    secondaryForeground: '#115e59',
    preview: 'linear-gradient(135deg, #14b8a6, #2dd4bf)',
  },
  {
    id: 'orange',
    label: 'Orange',
    description: 'Vitalité et dynamisme',
    primary: '#f97316',
    primaryForeground: '#ffffff',
    accent: '#fed7aa',
    accentForeground: '#7c2d12',
    secondary: '#ffedd5',
    secondaryForeground: '#9a3412',
    preview: 'linear-gradient(135deg, #f97316, #fb923c)',
  },
  {
    id: 'slate',
    label: 'Ardoise',
    description: 'Professionnel et sobre',
    primary: '#475569',
    primaryForeground: '#ffffff',
    accent: '#cbd5e1',
    accentForeground: '#1e293b',
    secondary: '#e2e8f0',
    secondaryForeground: '#334155',
    preview: 'linear-gradient(135deg, #475569, #64748b)',
  },
];

/** Light-mode background options */
export interface BackgroundOption {
  id: string;
  label: string;
  bg: string;
  card: string;
  preview: string;
}

export const BACKGROUND_PRESETS: BackgroundOption[] = [
  {
    id: 'white',
    label: 'Blanc pur',
    bg: '#ffffff',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #ffffff 50%, #f8fafc 50%)',
  },
  {
    id: 'warm',
    label: 'Chaud',
    bg: '#fefce8',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #fefce8 50%, #fffbeb 50%)',
  },
  {
    id: 'cool',
    label: 'Froid',
    bg: '#f0f9ff',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #f0f9ff 50%, #e0f2fe 50%)',
  },
  {
    id: 'mint',
    label: 'Menthe',
    bg: '#f0fdf4',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #f0fdf4 50%, #dcfce7 50%)',
  },
  {
    id: 'rose-bg',
    label: 'Rosé',
    bg: '#fff1f2',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #fff1f2 50%, #ffe4e6 50%)',
  },
  {
    id: 'lavender',
    label: 'Lavande',
    bg: '#faf5ff',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #faf5ff 50%, #f3e8ff 50%)',
  },
  {
    id: 'gray',
    label: 'Gris clair',
    bg: '#f8fafc',
    card: '#ffffff',
    preview: 'linear-gradient(135deg, #f8fafc 50%, #f1f5f9 50%)',
  },
];

/**
 * Apply a theme preset to the document root CSS variables.
 * Call this from client-side code only.
 */
export function applyThemePreset(preset: ThemePreset, isDark: boolean) {
  const root = document.documentElement;

  if (!isDark) {
    root.style.setProperty('--primary', preset.primary);
    root.style.setProperty('--primary-foreground', preset.primaryForeground);
    root.style.setProperty('--accent', preset.accent);
    root.style.setProperty('--accent-foreground', preset.accentForeground);
    root.style.setProperty('--secondary', preset.secondary);
    root.style.setProperty('--secondary-foreground', preset.secondaryForeground);
    root.style.setProperty('--ring', preset.primary);
    root.style.setProperty('--chart-1', preset.primary);
  } else {
    // In dark mode, we derive darker variants
    root.style.setProperty('--primary', preset.primary);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--ring', preset.primary);
    root.style.setProperty('--chart-1', preset.primary);
  }
}

/**
 * Apply a background preset.
 */
export function applyBackgroundPreset(bg: BackgroundOption) {
  const root = document.documentElement;
  root.style.setProperty('--background', bg.bg);
  root.style.setProperty('--card', bg.card);
  root.style.setProperty('--popover', bg.card);
}

/**
 * Reset to default CSS variables (removes inline styles).
 */
export function resetTheme() {
  const root = document.documentElement;
  [
    '--primary', '--primary-foreground', '--accent', '--accent-foreground',
    '--secondary', '--secondary-foreground', '--ring', '--chart-1',
    '--background', '--card', '--popover',
  ].forEach((v) => root.style.removeProperty(v));
}
