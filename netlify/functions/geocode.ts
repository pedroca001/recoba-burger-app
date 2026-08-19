import { json, parseBody, resolveAddress } from "./_shared";

export default async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const input = await parseBody<{ query?: string; latitude?: number; longitude?: number }>(request);
    return json(await resolveAddress(input));
  } catch (reason) {
    return json({ error: reason instanceof Error ? reason.message : "Não foi possível localizar o endereço." }, 400);
  }
};
