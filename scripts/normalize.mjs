import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { optimize } from "svgo";

const RAW_DIR = "raw";
const OUT_DIR = "src/svgs";

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const content = readFileSync(join(RAW_DIR, file), "utf-8");

  // 1. Reemplazar stroke/fill "white" por currentColor
  let normalized = content
    .replace(/stroke="white"/g, 'stroke="currentColor"')
    .replace(/fill="white"/g, 'fill="currentColor"');

  // 2. Normalizar viewBox a 0 0 24 24
  // Extrae el viewBox original y crea uno centrado en 0 0 24 24
  const viewBoxMatch = normalized.match(/viewBox="([\d.\-\s]+)"/);
  if (viewBoxMatch) {
    const [x, y, w, h] = viewBoxMatch[1].split(/\s+/).map(Number);
    // Envolvemos los paths en un <g transform> que los centra y escala a 24x24
    const scale = 24 / Math.max(w, h);
    const tx = -x * scale + (24 - w * scale) / 2;
    const ty = -y * scale + (24 - h * scale) / 2;

    normalized = normalized
      .replace(/viewBox="[\d.\-\s]+"/, 'viewBox="0 0 24 24"')
      .replace(
        /(<svg[^>]*>)/,
        `$1<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(
          3,
        )}) scale(${scale.toFixed(5)})">`,
      )
      .replace(/<\/svg>/, "</g></svg>");
  }

  // 3. Optimizar con SVGO
  const result = optimize(normalized, {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { removeViewBox: false } },
      },
      { name: "removeDimensions" },
    ],
  });

  writeFileSync(join(OUT_DIR, basename(file)), result.data);
  console.log(`✓ ${file}`);
}

console.log(`\nDone. ${files.length} icons normalized.`);
