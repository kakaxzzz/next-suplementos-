// auth.js
// -----------------------------------------------------------------------
// Funções de segurança: transformar senha em hash, conferir senha, e
// gerar/validar tokens de sessão (o "crachá" que a pessoa recebe depois
// de entrar na conta, e que o site guarda pra saber que ela está logada).
//
// Tudo aqui usa o módulo "crypto", que já vem embutido no Node — de novo,
// sem precisar instalar nada de fora.
// -----------------------------------------------------------------------

const crypto = require('crypto');

// ---- Senhas ----
//
// Nunca guardamos a senha como foi digitada. Em vez disso:
// 1. Criamos um "salt" aleatório (um tempero único pra essa senha).
// 2. Passamos senha + salt por uma função (scrypt) que é de propósito
//    lenta e difícil de reverter — assim, mesmo que alguém roube o
//    banco de dados, não dá pra descobrir a senha original com
//    facilidade.

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  // timingSafeEqual evita um tipo de ataque onde alguém tenta adivinhar
  // a senha medindo quanto tempo a comparação demora.
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---- Tokens de sessão ----
//
// Depois que a pessoa entra na conta, geramos uma string aleatória longa
// (o token). O site guarda esse token (o frontend guarda em memória) e
// manda ele em toda requisição seguinte, pra provar quem é sem precisar
// digitar a senha de novo a cada clique.

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { hashPassword, verifyPassword, generateToken };
