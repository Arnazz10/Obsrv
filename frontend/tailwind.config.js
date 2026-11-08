/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        soft: 'rgb(var(--soft) / <alpha-value>)',
        mute: 'rgb(var(--mute) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        crit: 'rgb(var(--crit) / <alpha-value>)',
        err: 'rgb(var(--err) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        info: 'rgb(var(--info) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '.55' }, '100%': { transform: 'scale(3.2)', opacity: '0' } },
        rowIn: { '0%': { opacity: '0', transform: 'translateY(-6px)', backgroundColor: 'rgb(var(--brand) / .12)' }, '100%': { opacity: '1', transform: 'none' } },
        slideIn: { '0%': { transform: 'translateX(24px)', opacity: '0' }, '100%': { transform: 'none', opacity: '1' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        dash: { to: { strokeDashoffset: '-40' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        sweep: { '0%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } }
      },
      animation: {
        pulseRing: 'pulseRing 2.4s cubic-bezier(.2,.6,.3,1) infinite',
        rowIn: 'rowIn .9s ease-out both',
        slideIn: 'slideIn .22s ease-out both',
        fadeUp: 'fadeUp .7s cubic-bezier(.2,.7,.2,1) both',
        marquee: 'marquee 60s linear infinite',
        dash: 'dash 2.4s linear infinite',
        float: 'float 6s ease-in-out infinite',
        sweep: 'sweep 3.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
