# AGENTS.md - Recoba Burger App

## Purpose

- Aplicacao oficial de cardapio digital e pedidos da Recoba Burger Santana.
- Stack: React, Vite, TypeScript, Netlify Functions e Netlify Blobs.
- Fonte de verdade operacional no Brain: `<BRAIN_ROOT>\Projetos\recoba_burger\recoba_burger_app.md`.

## Ownership

- Codigo fonte: este repositorio em `<CODIGO_ROOT>\recoba-burger-app`.
- Catalogo importado: `src/data/menu.json` e imagens locais em `public/products/`.
- Origem auditavel do catalogo: `scripts/source/` e `scripts/build-menu.mjs`.
- Deploy: GitHub privado `pedroca001/recoba-burger-app` conectado por webhook a Netlify `recoba-burger`.
- URL de producao: `https://recoba-burger.netlify.app`.

## Local Contracts

- Nunca enviar dados abertos de cartao ao backend. O navegador tokeniza direto na infraestrutura Pagar.me/Stone e o backend recebe somente `card_token`.
- Segredos ficam exclusivamente em variaveis de ambiente da Netlify. Nao commitar `.env` nem registrar valores em docs.
- O backend recalcula catalogo, adicionais, pedido minimo e raio de entrega. Nao confiar em totais enviados pelo navegador.
- Durante a fase de testes, a loja permanece sempre aberta e nao ha bloqueio por horario no frontend ou backend.
- Pedido minimo: R$ 35,00. Entrega gratis. Raio maximo: 3 km da Rua Pedro Doll, 259.
- A interface e mobile-first. As categorias promocionais usam carrossel horizontal e a sacola exibe a economia apenas para combos com preco avulso auditado.
- Preservar fotos importadas localmente. Nao trocar por hotlinks sem decisao explicita.

## Work Guidance

- Rode `npm run menu:build` apenas quando houver uma nova captura de `scripts/source/`.
- Alteracoes de checkout devem ser testadas primeiro com chaves sandbox e dominio sandbox autorizado no Dash.
- Pedidos persistem no store site-scoped `recoba-orders` do Netlify Blobs.
- Eventos de pagamento entram por `/.netlify/functions/stone-webhook` e exigem `STONE_WEBHOOK_TOKEN`.

## Verification

- `npm run check`
- `npm run build`
- `npm run test`
- `npm run menu:verify`
- Validacao manual em 320, 390 e 430 px do onboarding, personalizacao, carrinho e checkout.

## Child DOX Index

- Nao ha DOX filhos. `netlify/functions/` contem o backend serverless e `src/` contem a interface React.
