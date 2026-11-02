// scripts/generate-feather-paths.js — sinh src/components/ui/featherPaths.js
//
// Nguồn: feather-icons@4.29.2 (MIT) — https://feathericons.com
// Chạy: node scripts/generate-feather-paths.js
//
// Vì sao phải sinh sẵn thay vì dùng @expo/vector-icons: bộ icon đó tải font lúc
// chạy, nếu font không nạp được (bản release thiếu asset, lỗi expo-font...) thì
// icon thành ô trống mà app không báo gì. Vẽ path bằng react-native-svg tránh
// hoàn toàn vấn đề này.
//
// Chỉ cần chạy lại khi muốn nâng phiên bản feather-icons.
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://unpkg.com/feather-icons@4.29.2/dist/icons.json';
const OUT = path.join(__dirname, '..', 'src', 'components', 'ui', 'featherPaths.js');

function attrsOf(raw) {
  const out = {};
  for (const m of raw.matchAll(/([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pointsToPath(points, close = false) {
  const nums = String(points || '').trim().split(/[\s,]+/).map(Number).filter(n => Number.isFinite(n));
  const pairs = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
  if (!pairs.length) return '';
  const head = `M${pairs[0][0]} ${pairs[0][1]}`;
  const rest = pairs.slice(1).map(([x, y]) => `L${x} ${y}`).join('');
  return `${head}${rest}${close ? 'Z' : ''}`;
}

function ellipseToPath(cx, cy, rx, ry) {
  const x = num(cx);
  const y = num(cy);
  const a = num(rx);
  const b = num(ry, a);
  return `M${x - a} ${y}A${a} ${b} 0 1 0 ${x + a} ${y}A${a} ${b} 0 1 0 ${x - a} ${y}Z`;
}

function rectToPath(attrs) {
  const x = num(attrs.x);
  const y = num(attrs.y);
  const w = num(attrs.width);
  const h = num(attrs.height);
  const rx = Math.min(num(attrs.rx, num(attrs.ry, 0)), w / 2, h / 2);
  const ry = Math.min(num(attrs.ry, rx), w / 2, h / 2);
  if (!rx && !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + rx} ${y}`
    + `H${x + w - rx}`
    + `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`
    + `V${y + h - ry}`
    + `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}`
    + `H${x + rx}`
    + `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}`
    + `V${y + ry}`
    + `A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
}

function svgToPaths(svg) {
  const paths = [];
  for (const m of svg.matchAll(/<([a-z]+)([^>]*)\/?>/g)) {
    const tag = m[1];
    const attrs = attrsOf(m[2]);
    let d = '';
    if (tag === 'path') d = String(attrs.d || '').trim();
    else if (tag === 'polyline') d = pointsToPath(attrs.points, false);
    else if (tag === 'polygon') d = pointsToPath(attrs.points, true);
    else if (tag === 'line') d = `M${num(attrs.x1)} ${num(attrs.y1)}L${num(attrs.x2)} ${num(attrs.y2)}`;
    else if (tag === 'circle') d = ellipseToPath(attrs.cx, attrs.cy, attrs.r);
    else if (tag === 'ellipse') d = ellipseToPath(attrs.cx, attrs.cy, attrs.rx, attrs.ry);
    else if (tag === 'rect') d = rectToPath(attrs);
    if (d) paths.push(d.replace(/\s+/g, ' ').trim());
  }
  return paths;
}

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Không tải được ${SOURCE}: HTTP ${res.status}`);
  const json = await res.json();

  const names = Object.keys(json).sort();
  const lines = names.map((name) => {
    const paths = svgToPaths(json[name]);
    if (!paths.length) throw new Error(`Không chuyển được icon: ${name}`);
    return `  '${name}': [${paths.map(d => `'${d}'`).join(', ')}],`;
  });

  const header = `// components/ui/featherPaths.js — FILE TỰ SINH, đừng sửa tay.
//
// Nguồn: feather-icons@4.29.2 (MIT) — bộ icon Feather, khung 24×24, nét 2px.
// Mỗi icon là danh sách path đã chuẩn hoá để vẽ bằng react-native-svg.
// Vẽ bằng SVG nên icon KHÔNG phụ thuộc việc tải font lúc chạy — tránh lỗi
// icon trắng/ô vuông khi font Feather không nạp được trên máy thật.
//
// Sinh lại: node scripts/generate-feather-paths.js

export const FEATHER_PATHS = {
`;

  fs.writeFileSync(OUT, `${header}${lines.join('\n')}\n};\n`);
  console.log(`Đã ghi ${names.length} icon → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
