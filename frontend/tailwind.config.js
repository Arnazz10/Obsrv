/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        panel: '#11182d',
        panel2: '#0f1528',
        grid: '#22304c',
        accent: {
          blue: '#4da3ff',
          amber: '#ffb84d',
          red: '#ff5f6d',
          darkred: '#8f1d2b'
        }
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(255,255,255,0.04), 0 12px 40px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};
