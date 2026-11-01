// `bun run icons`: renders the app icon (a paw print, no known character, spec 7)
// from the SVG below to public/icon-192.png, icon-512.png and icon-maskable.png.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BG = "#1E6FB8";
const SKY = "#E6F3FA";

/** Paw print in a 100 × 100 box, centred. `scale` < 1 keeps it in the maskable safe zone. */
function svg(scale: number, rounded: boolean): string {
  const s = scale;
  const t = (50 * (1 - s)).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="${BG}"/>
  <g transform="translate(${t} ${t}) scale(${s})" fill="${SKY}">
    <ellipse cx="50" cy="64" rx="19" ry="16"/>
    <ellipse cx="27" cy="44" rx="8" ry="10.5" transform="rotate(-18 27 44)"/>
    <ellipse cx="41" cy="31" rx="8" ry="11"/>
    <ellipse cx="59" cy="31" rx="8" ry="11"/>
    <ellipse cx="73" cy="44" rx="8" ry="10.5" transform="rotate(18 73 44)"/>
  </g>
</svg>`;
}

async function render(file: string, size: number, scale: number, rounded: boolean) {
  const png = await sharp(Buffer.from(svg(scale, rounded)), { density: (72 * size) / 100 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(file, png);
  console.log(`✓ ${file}`);
}

await render("public/icon-192.png", 192, 0.9, true);
await render("public/icon-512.png", 512, 0.9, true);
// Maskable: full-bleed background, paw inside the 80 % safe circle.
await render("public/icon-maskable.png", 512, 0.7, false);
await render("public/apple-touch-icon.png", 180, 0.85, false);
await writeFile("public/favicon.svg", `${svg(0.9, true)}\n`);
console.log("✓ public/favicon.svg");
