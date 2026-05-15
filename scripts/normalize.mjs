import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { optimize } from "svgo";

const RAW_DIR = "raw";
const OUT_DIR = "src/svgs";
const STROKE_WIDTH = "1.5"; // grosor estándar para iconos de 24x24

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const content = readFileSync(join(RAW_DIR, file), "utf-8");

  let normalized = content
    .replace(/stroke="white"/g, 'stroke="currentColor"')
    .replace(/fill="white"/g, 'fill="currentColor"');

  const viewBoxMatch = normalized.match(/viewBox="([\d.\-\s]+)"/);
  if (viewBoxMatch) {
    const [x, y, w, h] = viewBoxMatch[1].split(/\s+/).map(Number);
    const PADDING = 2;
    const targetSize = 24 - PADDING * 2;
    const scale = targetSize / Math.max(w, h);
    const tx = -x * scale + (24 - w * scale) / 2;
    const ty = -y * scale + (24 - h * scale) / 2;

    normalized = normalized
      .replace(/viewBox="[\d.\-\s]+"/, 'viewBox="0 0 24 24"')
      .replace(
        /(<svg[^>]*>)/,
        `$1<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})">`,
      )
      .replace(/<\/svg>/, "</g></svg>");
  }

  const result = optimize(normalized, {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { removeViewBox: false } },
      },
      { name: "removeDimensions" },
    ],
  });

  // Forzar stroke-width consistente después de que SVGO aplane el transform
  let finalSvg = result.data.replace(
    /stroke-width="[\d.]+"/g,
    `stroke-width="${STROKE_WIDTH}"`,
  );

  writeFileSync(join(OUT_DIR, basename(file)), finalSvg);
  console.log(`✓ ${file}`);
}

console.log(`\nDone. ${files.length} icons normalized.`);
