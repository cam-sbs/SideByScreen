// Tailwind v4 : les tokens actifs sont définis via @theme dans globals.css.
// Ce fichier sert à l'IntelliSense / outillage éditeur.
const config = {
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0C0C0E',
          2: '#181A1E',
          3: '#23262C',
          4: '#2E3138',
        },
        fog: {
          DEFAULT: '#F2EFE9',
          2: '#E5E0D8',
        },
        dust: {
          DEFAULT: '#8A8680',
          2: '#5C5A56',
        },
        sage: {
          DEFAULT: '#4A8C6F',
          light: '#5FA882',
          dim: 'rgba(74,140,111,0.10)',
          border: 'rgba(74,140,111,0.22)',
        },
        gold: {
          DEFAULT: '#C4A05A',
          dim: 'rgba(196,160,90,0.13)',
        },
        clay: {
          DEFAULT: '#C8855A',
          dim: 'rgba(200,133,90,0.11)',
        },
        urgent: {
          DEFAULT: '#D94F4F',
          dim: 'rgba(217,79,79,0.10)',
        },
        warn: {
          DEFAULT: '#D4893A',
          dim: 'rgba(212,137,58,0.10)',
        },
        avatar: {
          bg: '#2E3138',
          text: '#8A8680',
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        sans: ['Geist', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '18px',
        full: '9999px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.12em' }],
        xs: ['11px', { lineHeight: '1.5' }],
        sm: ['12px', { lineHeight: '1.5' }],
        base: ['13px', { lineHeight: '1.6' }],
        md: ['14px', { lineHeight: '1.5' }],
        lg: ['15px', { lineHeight: '1.4' }],
        xl: ['18px', { lineHeight: '1.3' }],
        '2xl': ['20px', { lineHeight: '1.2' }],
        '3xl': ['26px', { lineHeight: '1.1' }],
        '4xl': ['32px', { lineHeight: '1.1' }],
        display: ['34px', { lineHeight: '1.0' }],
      },
    },
  },
}

export default config
