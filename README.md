# NEXT SUPLEMENTOS — Backend (contas e login)

Este é o primeiro pedaço do backend: contas de usuário de verdade,
com senha protegida e guardada num banco de dados de verdade (não
mais na memória do navegador).

## O que tem aqui

```
next-backend/
  server.js     -> o servidor (recebe os pedidos do site)
  db.js         -> conecta e prepara o banco de dados (SQLite)
  auth.js       -> funções de senha (hash) e token de login
  public/
    index.html  -> o site (mesmo arquivo de antes, já ligado na API)
```

Não precisa instalar **nada** com `npm install` — usamos só o que já
vem dentro do Node.js (o módulo de banco de dados SQLite, e o módulo
de criptografia). Isso deixa tudo mais simples de entender e rodar.

## Como rodar

Você precisa ter o **Node.js** instalado no computador (versão 22 ou
mais nova, por causa do módulo de SQLite embutido). Pra conferir:

```
node --version
```

Depois:

1. Abra o terminal dentro da pasta `next-backend`
2. Rode:
   ```
   node server.js
   ```
3. Você vai ver a mensagem:
   ```
   Servidor da NEXT SUPLEMENTOS rodando em http://localhost:3000
   ```
4. Abra o navegador em **http://localhost:3000** (não é mais pra abrir
   o arquivo `index.html` direto — agora é esse endereço).

Pronto: o site e o servidor estão conversando, e as contas ficam
salvas de verdade no arquivo `next.db` que aparece na pasta — mesmo
que você feche o navegador ou desligue o computador, as contas
continuam lá na próxima vez que você rodar `node server.js`.

## O que já funciona

- **Criar conta** (`POST /api/signup`): guarda nome, e-mail e a senha
  já protegida (nunca em texto puro).
- **Entrar** (`POST /api/login`): só funciona com e-mail e senha de
  uma conta que já existe.
- **Ver quem está logado** (`GET /api/me`): usando o token que a
  pessoa recebeu ao entrar.
- **Sair** (`POST /api/logout`): invalida o token, então ele para de
  funcionar.

## O que ainda falta (próximas partes)

- Produtos e estoque vindo do banco de dados (hoje ainda estão fixos
  no código do site)
- Pedidos, carrinho e status ligados à conta de verdade
- Pagamento (Pix/cartão) e frete de verdade, que dependem de você
  criar contas em serviços externos

## Por que isso resolve o problema do CEP

Antes, o site era aberto como um arquivo local (`file://...`), e o
navegador bloqueia esse tipo de arquivo de conversar com serviços de
fora — por isso a busca de CEP nunca funcionava, não importava o que
a gente ajustasse no código.

Agora que o site é servido por este servidor (`http://localhost:3000`),
ele deixa de ser um "arquivo solto" e passa a ser um site de verdade
rodando localmente — o que já resolve boa parte dessas travas de
segurança do navegador. Teste a busca de CEP de novo depois de abrir
o site por esse endereço.
