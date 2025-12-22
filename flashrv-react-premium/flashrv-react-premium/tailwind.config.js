/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { ink:"#0F172A", muted:"#64748B", line:"#E2E8F0", surface:"#FFFFFF", canvas:"#FAFAFA", primary:"#6D28D9" },
      borderRadius: { xl2:"1.25rem", xl3:"1.75rem" },
      boxShadow: { soft:"0 10px 30px rgba(15, 23, 42, 0.08)", card:"0 8px 24px rgba(15, 23, 42, 0.06)" },
    },
  },
  plugins: [],
};
