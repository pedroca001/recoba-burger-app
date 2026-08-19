import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(root, "scripts", "source");
const outputRoot = path.join(root, "public", "products");

const readJson = async (file) => {
  const text = await readFile(file, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
};

const parseMoney = (value) => {
  const match = String(value).match(/R\$\s*([\d.]+,\d{2})/);
  if (!match) return 0;
  return Math.round(Number(match[1].replace(/\./g, "").replace(",", ".")) * 100);
};

const extensionFor = (contentType, url) => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("avif")) return "avif";
  const fallback = new URL(url).pathname.match(/\.(png|webp|avif|jpe?g)$/i)?.[1];
  return fallback?.toLowerCase().replace("jpeg", "jpg") || "jpg";
};

const list = await readJson(path.join(sourceRoot, "menu-list.json"));
const modifierRows = await readJson(path.join(sourceRoot, "menu-modifiers.json"));
const modifiersById = new Map(modifierRows.map((row) => [String(row.id), row.groups]));
await mkdir(outputRoot, { recursive: true });

const entries = list.flatMap((category) =>
  category.products.map((product) => ({ ...product, category: category.name })),
);

const images = new Map();
for (const product of entries) {
  if (product.imageUrl) images.set(product.id, product.imageUrl);
}

const localImages = new Map();
const queue = [...images.entries()];
let cursor = 0;
const worker = async () => {
  while (cursor < queue.length) {
    const [id, url] = queue[cursor++];
    const response = await fetch(url, { headers: { "user-agent": "RecobaBurgerMenuImporter/1.0" } });
    if (!response.ok) throw new Error(`Falha ao baixar imagem ${id}: HTTP ${response.status}`);
    const extension = extensionFor(response.headers.get("content-type") || "", url);
    const filename = `${id}.${extension}`;
    await writeFile(path.join(outputRoot, filename), Buffer.from(await response.arrayBuffer()));
    localImages.set(id, `/products/${filename}`);
  }
};
await Promise.all(Array.from({ length: 6 }, worker));

const catalog = {
  importedAt: new Date().toISOString(),
  source: "Recoba Burger public digital menu",
  categories: list.map((category) => ({
    id: category.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    name: category.name,
    products: category.products.map((product) => ({
      id: String(product.id),
      name: product.name,
      description: product.description,
      price: parseMoney(product.priceText),
      priceLabel: product.priceText,
      image: localImages.get(String(product.id)) || null,
      groups: (modifiersById.get(String(product.id)) || []).map((group, groupIndex) => {
        const maximum = Number(String(group.limit).split("/").pop()?.trim()) || 1;
        const required = group.hint === "OBRIGATÓRIO" || /escolha\s+1/i.test(group.hint);
        return {
          id: `${product.id}-g${groupIndex + 1}`,
          name: group.name,
          hint: group.hint,
          minimum: required ? (group.hint === "OBRIGATÓRIO" ? maximum : 1) : 0,
          maximum,
          options: group.options.map((option, optionIndex) => ({
            id: `${product.id}-g${groupIndex + 1}-o${optionIndex + 1}`,
            name: option.name,
            description: option.description,
            price: parseMoney(option.priceText),
          })),
        };
      }),
    })),
  })),
};

await writeFile(path.join(root, "src", "data", "menu.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Catalogo gerado: ${catalog.categories.length} categorias, ${entries.length} produtos, ${localImages.size} fotos locais.`);
