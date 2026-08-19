import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const menu = JSON.parse(await readFile(path.join(root, "src", "data", "menu.json"), "utf8"));
const products = menu.categories.flatMap((category) => category.products);
const ids = new Set(products.map((product) => product.id));
const errors = [];

if (menu.categories.length !== 10) errors.push(`Esperadas 10 categorias, recebidas ${menu.categories.length}`);
if (products.length !== 91) errors.push(`Esperados 91 produtos, recebidos ${products.length}`);
if (ids.size !== products.length) errors.push("Ha IDs de produto duplicados");

for (const product of products) {
  if (!product.name) errors.push(`Produto ${product.id} sem nome`);
  if (!Number.isInteger(product.price) || product.price < 0) errors.push(`Produto ${product.id} com preco invalido`);
  if (product.image) {
    const file = path.join(root, "public", product.image.replace(/^\//, ""));
    await access(file).catch(() => errors.push(`Imagem ausente: ${product.image}`));
    const info = await stat(file).catch(() => null);
    if (info && info.size < 1_000) errors.push(`Imagem pequena ou invalida: ${product.image}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${menu.categories.length} categorias, ${products.length} produtos, ${products.filter((p) => p.image).length} imagens locais.`);
