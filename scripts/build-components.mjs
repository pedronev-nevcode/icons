import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";

const SVG_DIR = "src/svgs";
const OUT_DIR = "src/components";

mkdirSync(OUT_DIR, { recursive: true });

// arrow.svg -> ArrowIcon
function toComponentName(file) {
  const name = basename(file, ".svg")
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  return `${name}Icon`;
}

// Convierte un SVG XML en JSX válido para React.
// - kebab-case attrs -> camelCase (stroke-width -> strokeWidth)
// - class -> className
// - elimina width/height fijos del <svg> raíz e inyecta size/ref/...props
function svgToJsx(svg) {
  let s = svg
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  s = s.replace(/(\s)([a-z]+(?:-[a-z]+)+)=/g, (_m, ws, name) => {
    const camel = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `${ws}${camel}=`;
  });

  s = s.replace(/(\s)class=/g, "$1className=");

  s = s.replace(/<svg([^>]*)>/, (_m, attrs) => {
    const cleaned = attrs
      .replace(/\swidth="[^"]*"/g, "")
      .replace(/\sheight="[^"]*"/g, "");
    return `<svg${cleaned} width={size} height={size} ref={ref} {...props}>`;
  });

  return s;
}

const files = readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg"));
const exports = [];

for (const file of files) {
  const svg = readFileSync(join(SVG_DIR, file), "utf-8");
  const componentName = toComponentName(file);
  const jsx = svgToJsx(svg);

  const code = `import * as React from "react";

export interface ${componentName}Props extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const ${componentName} = React.forwardRef<SVGSVGElement, ${componentName}Props>(
  ({ size = 24, ...props }, ref) => (
    ${jsx}
  )
);

${componentName}.displayName = "${componentName}";

export default ${componentName};
`;

  writeFileSync(join(OUT_DIR, `${componentName}.tsx`), code);
  exports.push(componentName);
  console.log(`\u2713 ${componentName}`);
}

const indexContent = exports
  .map((name) => `export { default as ${name} } from "./components/${name}";`)
  .join("\n");

writeFileSync(join("src", "index.ts"), indexContent + "\n");
console.log(`\nDone. ${files.length} components generated.`);
