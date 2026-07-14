// db.js
// -----------------------------------------------------------------------
// Aqui a gente cuida do banco de dados. Usamos o SQLite, que é um banco
// de dados que vive num arquivo só (next.db) — não precisa instalar
// nenhum servidor de banco separado, o que é perfeito pra começar.
//
// Usamos o módulo "node:sqlite", que já vem embutido no Node.js — por
// isso não precisamos rodar "npm install" pra nada aqui.
// -----------------------------------------------------------------------

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// O arquivo do banco fica na mesma pasta do projeto.
const dbPath = path.join(__dirname, 'next.db');
const db = new DatabaseSync(dbPath);

// Criamos as tabelas se ainda não existirem.
// "users" guarda as contas. Repare que NUNCA guardamos a senha em texto
// puro — guardamos só o hash (uma versão embaralhada e irreversível dela)
// junto com um "salt" (um valor aleatório usado para embaralhar).
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// "sessions" guarda os tokens de login ativos. Cada vez que alguém entra
// na conta, criamos uma linha aqui. Pra sair da conta (logout), a gente
// só apaga a linha — o token para de funcionar na hora.
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;
