/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette "boîte de nuit luxueuse" : noir profond + or + néon
        ink: {
          900: '#050505',
          800: '#0a0a0a',
          700: '#111113',
          600: '#18181b',
          500: '#27272a',
        },
        // Calibré sur la lueur néon de l'éclair du logo officiel
        gold: {
          DEFAULT: '#f7b733',
          soft: '#ffe0a3',
          deep: '#ff7a18',
        },
        flex: {
          // accent néon pour les micro-récompenses
          pink: '#ff4d8d',
          violet: '#8b5cf6',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // halo néon doré-orangé (lueur de l'éclair)
        glow: '0 0 44px -6px rgba(247,183,51,0.55)',
        'glow-pink': '0 0 36px -6px rgba(255,77,141,0.55)',
        card: '0 10px 40px -12px rgba(0,0,0,0.85)',
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(135deg,#ffe0a3 0%,#f7b733 45%,#ff7a18 100%)',
        'noir-grad': 'radial-gradient(120% 120% at 50% 0%,#141210 0%,#0a0807 55%,#050505 100%)',
      },
      keyframes: {
        'flex-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '50%': { transform: 'scale(1.25)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-80px) scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        'flex-pop': 'flex-pop 0.45s cubic-bezier(.2,.9,.3,1.4)',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-ring': 'pulse-ring 1.1s ease-out infinite',
        'float-up': 'float-up 0.9s ease-out forwards',
      },
    },
  },
  plugins: [],
}
