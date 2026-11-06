export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#0f766e', 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 700: '#115e59' }, paper: '#faf8f5' },
      fontFamily: {
        sans: ['var(--font-sans)'],
        hanzi: ['var(--font-hanzi)'],
        pinyin: ['var(--font-pinyin)'],
      },
    },
  },
  plugins: [],
};
