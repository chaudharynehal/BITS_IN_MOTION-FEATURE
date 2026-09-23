# Bundled existing typefaces

Manrope (Google Fonts v20) and Space Grotesk (v22) were already used by the application. Their unmodified WOFF2 subsets are now served locally to remove the runtime Google Fonts request and make typography independent of that service's availability.

Downloaded on 23 September 2026 from the stylesheet:
https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap

All original subsets are retained; `src/styles/fonts.css` uses unicode ranges so browsers fetch only the subsets needed. No new typeface or runtime dependency was introduced.

Both families are distributed under SIL Open Font License 1.1. Exact upstream notices are included in `manrope-OFL.txt` and `spacegrotesk-OFL.txt`, from:

- https://github.com/google/fonts/tree/main/ofl/manrope
- https://github.com/google/fonts/tree/main/ofl/spacegrotesk
