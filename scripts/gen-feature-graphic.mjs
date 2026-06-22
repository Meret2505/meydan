import sharp from "sharp";
// Google Play feature graphic: exactly 1024 x 500 px, JPG or 24-bit PNG, no alpha.
const W = 1024, H = 500;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="60%">
      <stop offset="0" stop-color="#103a24"/>
      <stop offset="1" stop-color="#0B0E0D"/>
    </radialGradient>
    <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1FD16B"/><stop offset="1" stop-color="#14a955"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g transform="translate(360 250)">
    <rect x="-66" y="-66" width="132" height="132" rx="34" fill="url(#logo)"/>
    <circle cx="0" cy="0" r="34" fill="#06210F"/>
    <circle cx="0" cy="0" r="14" fill="none" stroke="#1FD16B" stroke-width="6"/>
  </g>
  <text x="455" y="232" font-family="Arial, sans-serif" font-weight="900" font-size="86" fill="#F2F5F3" letter-spacing="-2">MEÝDAN</text>
  <text x="458" y="290" font-family="Arial, sans-serif" font-weight="600" font-size="30" fill="#8A938E">Найди игру рядом. Приходи и играй.</text>
</svg>`;
await sharp(Buffer.from(svg)).flatten({ background: "#0B0E0D" }).png().toFile("android/play-feature-graphic-1024x500.png");
console.log("ok android/play-feature-graphic-1024x500.png");
