import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist-pages");
const publicDirectory = path.join(projectRoot, "public");
const catalogUrl = process.env.MANDALARIA_CATALOG_URL
  ?? "https://mandalaria-dogum.mandalaria-dogum-shop.workers.dev/api/catalog";

const response = await fetch(catalogUrl, { headers: { accept: "application/json" } });
if (!response.ok) {
  throw new Error(`Could not fetch the public catalog (${response.status}).`);
}
const catalog = await response.json();
if (!Array.isArray(catalog.categories) || !Array.isArray(catalog.products)) {
  throw new Error("The public catalog response has an unexpected shape.");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(path.join(publicDirectory, "assets"), path.join(outputDirectory, "assets"), { recursive: true });
await cp(path.join(publicDirectory, "app.js"), path.join(outputDirectory, "app.js"));
await cp(path.join(publicDirectory, "auth-client.js"), path.join(outputDirectory, "auth-client.js"));
await cp(path.join(publicDirectory, "styles.css"), path.join(outputDirectory, "styles.css"));

const html = await readFile(path.join(projectRoot, "legacy-index.html"), "utf8");
if (!html.includes('<meta name="robots" content="noindex,nofollow">')) {
  throw new Error("Expected the source page to contain its private-preview robots tag.");
}
await writeFile(
  path.join(outputDirectory, "index.html"),
  html
    .replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">')
    .replace(
      "<body>",
      '<body>\n<div class="pages-preview-note" role="note">Prévia visual no GitHub Pages. O catálogo atual tem ' +
        `${catalog.products.length} ${catalog.products.length === 1 ? "produto publicado" : "produtos publicados"}. ` +
      '<a href="https://mandalaria-dogum.mandalaria-dogum-shop.workers.dev/">Abrir a loja completa com login e painel ↗</a></div>',
    ),
);

const config = await readFile(path.join(publicDirectory, "config.js"), "utf8");
await writeFile(
  path.join(outputDirectory, "config.js"),
  `${config.trim()}\nwindow.MANDALARIA_CONFIG.staticMode = true;\nwindow.MANDALARIA_CONFIG.catalog = ${JSON.stringify(catalog)};\ndocument.documentElement.classList.add("github-pages");\n`,
);

const appPath = path.join(outputDirectory, "app.js");
const app = await readFile(appPath, "utf8");
const apiFunction = `async function api(path, options = {}) {\n  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });`;
if (!app.includes(apiFunction)) {
  throw new Error("Could not find the API helper to prepare the static Pages build.");
}
const staticApiFunction = `async function api(path, options = {}) {\n  if (window.MANDALARIA_CONFIG.staticMode) {\n    if (path === '/api/catalog' || path === '/api/admin/catalog') return window.MANDALARIA_CONFIG.catalog;\n    if (path === '/api/me') return { authenticated: false, admin: false };\n    throw new Error('A gestão da loja está disponível somente no site principal.');\n  }\n  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options });`;
await writeFile(appPath, app.replace(apiFunction, staticApiFunction));

const stylesPath = path.join(outputDirectory, "styles.css");
await writeFile(
  stylesPath,
  `${await readFile(stylesPath, "utf8")}\n.pages-preview-note{background:#402f23;color:#fffdf8;text-align:center;padding:10px 18px;font-size:12px;line-height:1.5}.pages-preview-note a{color:#f3d487;text-decoration:underline;text-underline-offset:3px;margin-left:4px}@media(max-width:600px){.pages-preview-note a{display:block;margin-left:0}}\n`,
);
await writeFile(path.join(outputDirectory, ".nojekyll"), "");

console.log(`Prepared GitHub Pages site with ${catalog.categories.length} categories and ${catalog.products.length} products.`);
