// ─────────────────────────────────────────────────────────────
// Thèmes : chaque utilisateur choisit son accent parmi 13.
// On ne change QUE la couleur d'accent (var CSS --accent) → tout
// l'app se re-colore (text-gold, bg-gold-grad, halos…), base sombre
// inchangée = cohérence minimaliste garantie.
// Les valeurs sont des triplets RGB "r g b" (pour rgb(var/<alpha>)).
// ─────────────────────────────────────────────────────────────

export interface Theme {
  key: string
  label: string
  accent: string
  soft: string
  deep: string
}

export const THEMES: Theme[] = [
  { key: 'or', label: 'Or', accent: '227 179 98', soft: '240 214 160', deep: '212 160 70' },
  { key: 'emeraude', label: 'Émeraude', accent: '52 211 153', soft: '110 231 183', deep: '16 185 129' },
  { key: 'saphir', label: 'Saphir', accent: '96 165 250', soft: '147 197 253', deep: '37 99 235' },
  { key: 'rubis', label: 'Rubis', accent: '244 63 94', soft: '251 113 133', deep: '225 29 72' },
  { key: 'amethyste', label: 'Améthyste', accent: '167 139 250', soft: '196 181 253', deep: '139 92 246' },
  { key: 'cyan', label: 'Cyan', accent: '34 211 238', soft: '103 232 249', deep: '6 182 212' },
  { key: 'rose', label: 'Rose', accent: '244 114 182', soft: '249 168 212', deep: '236 72 153' },
  { key: 'lime', label: 'Lime', accent: '163 230 53', soft: '190 242 100', deep: '132 204 22' },
  { key: 'corail', label: 'Corail', accent: '251 146 60', soft: '253 186 116', deep: '249 115 22' },
  { key: 'indigo', label: 'Indigo', accent: '129 140 248', soft: '165 180 252', deep: '99 102 241' },
  { key: 'turquoise', label: 'Turquoise', accent: '45 212 191', soft: '94 234 212', deep: '20 184 166' },
  { key: 'argent', label: 'Argent', accent: '203 213 225', soft: '226 232 240', deep: '148 163 184' },
  { key: 'platine', label: 'Platine', accent: '228 228 231', soft: '244 244 245', deep: '161 161 170' },
]

const KEY = 'flex.theme'

export function applyTheme(t: Theme): void {
  const s = document.documentElement.style
  s.setProperty('--accent', t.accent)
  s.setProperty('--accent-soft', t.soft)
  s.setProperty('--accent-deep', t.deep)
}

export function currentThemeKey(): string {
  try {
    return localStorage.getItem(KEY) ?? 'or'
  } catch {
    return 'or'
  }
}

export function setTheme(key: string): void {
  const t = THEMES.find((x) => x.key === key) ?? THEMES[0]
  applyTheme(t)
  try {
    localStorage.setItem(KEY, t.key)
  } catch {
    /* no-op */
  }
}

/** À appeler au démarrage (avant le rendu) pour éviter tout flash. */
export function initTheme(): void {
  setTheme(currentThemeKey())
}
