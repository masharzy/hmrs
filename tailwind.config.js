export default {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172b40",
        primary: "#176b61",
        muted: "#66788b",
        canvas: "#f7f9f8",
        line: "#e3e9e7"
      },
      fontFamily: { sans: ['"Noto Sans Bengali"', "Arial", "sans-serif"] }
    }
  },
  plugins: []
};