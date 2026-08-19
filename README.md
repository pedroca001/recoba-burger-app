# Recoba Burger

Cardapio digital e checkout da Recoba Burger Santana, desenvolvido em React, TypeScript e Netlify Functions.

## O que esta pronto

- catalogo com 10 categorias, 91 produtos, adicionais e 89 fotos armazenadas no proprio app;
- onboarding por CEP, endereco ou geolocalizacao;
- entrega gratis em um raio de ate 3 km da Rua Pedro Doll, 259;
- pedido minimo de R$ 35,00 e pedidos somente entre 17h e 23h, no fuso de Sao Paulo;
- carrinho, personalizacoes e checkout responsivo;
- Pix e cartao pela Core API v5 da Pagar.me/Stone;
- persistencia de pedidos com Netlify Blobs e atualizacao por webhook;
- eventos opcionais para Meta Pixel e preservacao de UTMs e click IDs.

## Desenvolvimento

Requisitos: Node.js 22 ou superior e Netlify CLI autenticada.

```powershell
npm install
npx netlify dev
```

Copie `.env.example` para `.env` apenas no ambiente local. Nunca versione chaves.

## Verificacao

```powershell
npm run check
npm run test
npm run build
npm run menu:verify
```

## Variaveis da Netlify

Obrigatorias para pagamentos reais:

- `STONE_PUBLIC_KEY`: chave publica da aplicacao Pagar.me/Stone;
- `STONE_SECRET_KEY`: chave secreta usada apenas nas Functions;
- `STONE_WEBHOOK_TOKEN`: token aleatorio incluido na URL do webhook.

Opcionais:

- `GOOGLE_MAPS_API_KEY`: melhora a geocodificacao de enderecos completos;
- `VITE_META_PIXEL_ID`: ativa o Meta Pixel no build;
- `STONE_API_URL`: sobrescreve o endpoint padrao da Core API v5.

`VITE_ENABLE_DEMO_CHECKOUT` existe somente para validacao local e deve permanecer desligada na producao.

## Ativacao da Stone

1. Confirme com a Stone/Pagar.me que a conta tem acesso a Core API v5 e obtenha as chaves publica e secreta.
2. Cadastre as variaveis acima em **Netlify > Project configuration > Environment variables**.
3. Gere um token aleatorio longo para `STONE_WEBHOOK_TOKEN`.
4. No Dash Pagar.me, cadastre o webhook:

   `https://SEU_DOMINIO/.netlify/functions/stone-webhook?token=SEU_TOKEN`

5. Assine ao menos eventos de pedido e cobranca, como `order.paid`, `order.payment_failed`, `charge.paid` e `charge.payment_failed`.
6. Autorize o dominio final para tokenizacao de cartao, caso essa opcao apareca no Dash.
7. Faca primeiro um pedido Pix e um pedido com cartao no ambiente de teste. Depois troque pelas chaves de producao e repita apenas uma compra de baixo valor.

O navegador envia os dados do cartao diretamente para a Pagar.me/Stone. O servidor da Recoba recebe somente o token do cartao.
