// server.js
// -----------------------------------------------------------------------
// Este é o servidor: o programa que fica rodando e "escutando" pedidos
// (requisições) que chegam do site (o front-end, o index.html).
//
// Usamos só o módulo "http", que já vem no Node — sem framework tipo
// Express, pra não depender de instalar nada da internet. É mais
// código na mão, mas dá pra ver exatamente o que está acontecendo em
// cada passo, o que ajuda bastante enquanto você está aprendendo.
//
// Como rodar:
//   node server.js
// O servidor vai subir em http://localhost:3000
// -----------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { hashPassword, verifyPassword, generateToken } = require('./auth');
const { handleChat } = require('./chat');

// No Render (e outros serviços), a porta vem da variável PORT.
const PORT = process.env.PORT || 3000;
const SESSION_DURATION_HOURS = 24 * 7; // token válido por 7 dias
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------

// Lê o corpo (body) de uma requisição e devolve como objeto JSON.
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (err) { reject(new Error('JSON inválido no corpo da requisição.')); }
    });
    req.on('error', reject);
  });
}

// Manda uma resposta em JSON, já com os cabeçalhos de CORS liberados
// (CORS = permissão pra um site diferente do servidor poder conversar
// com ele; sem isso, o navegador bloqueia a requisição).
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Descobre qual usuário está fazendo a requisição, olhando o token
// enviado no cabeçalho "Authorization: Bearer <token>".
function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const session = db.prepare(
    `SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')`
  ).get(token);
  if (!session) return null;

  const user = db.prepare(`SELECT id, name, email FROM users WHERE id = ?`).get(session.user_id);
  return user || null;
}

// ---------------------------------------------------------------------
// Rotas (o que o servidor faz para cada combinação de método + caminho)
// ---------------------------------------------------------------------

async function handleSignup(req, res) {
  const body = await readJsonBody(req);
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!name || !email) return sendJson(res, 400, { error: 'Preencha nome e e-mail.' });
  if (!isValidEmail(email)) return sendJson(res, 400, { error: 'E-mail inválido.' });
  if (password.length < 6) return sendJson(res, 400, { error: 'A senha precisa ter pelo menos 6 caracteres.' });

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
  if (existing) return sendJson(res, 409, { error: 'Já existe uma conta com esse e-mail.' });

  const { hash, salt } = hashPassword(password);
  const info = db.prepare(
    `INSERT INTO users (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)`
  ).run(name, email, hash, salt);

  const token = createSession(info.lastInsertRowid);
  sendJson(res, 201, { user: { id: info.lastInsertRowid, name, email }, token });
}

async function handleLogin(req, res) {
  const body = await readJsonBody(req);
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) return sendJson(res, 400, { error: 'Digite e-mail e senha.' });

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  if (!user) return sendJson(res, 401, { error: 'Não existe conta com esse e-mail. Crie uma conta primeiro.' });

  const ok = verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) return sendJson(res, 401, { error: 'Senha incorreta.' });

  const token = createSession(user.id);
  sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email }, token });
}

function createSession(userId) {
  const token = generateToken();
  db.prepare(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DURATION_HOURS} hours'))`
  ).run(token, userId);
  return token;
}

async function handleMe(req, res) {
  const user = getUserFromRequest(req);
  if (!user) return sendJson(res, 401, { error: 'Não autenticado.' });
  sendJson(res, 200, { user });
}

async function handleLogout(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  sendJson(res, 200, { ok: true });
}

// ---------------------------------------------------------------------
// Servidor HTTP: decide qual função chamar de acordo com o caminho
// ---------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // Requisições "OPTIONS" são um pedido de permissão que o navegador
  // manda antes de POST/GET entre sites diferentes (parte do CORS).
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  try {
    if (req.method === 'POST' && req.url === '/api/signup') return await handleSignup(req, res);
    if (req.method === 'POST' && req.url === '/api/login') return await handleLogin(req, res);
    if (req.method === 'POST' && req.url === '/api/logout') return await handleLogout(req, res);
    if (req.method === 'GET' && req.url === '/api/me') return await handleMe(req, res);
    if (req.method === 'POST' && req.url === '/api/chat') return await handleChat(req, res, { readJsonBody, sendJson });

    // Qualquer outra rota GET: tenta servir como arquivo estático do site
    // (o index.html e, futuramente, outros arquivos da pasta "public").
    if (req.method === 'GET' && !req.url.startsWith('/api/')) {
      return serveStatic(req, res);
    }

    sendJson(res, 404, { error: 'Rota não encontrada.' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Erro interno do servidor.' });
  }
});

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, decodeURIComponent(urlPath));

  // Proteção simples pra ninguém conseguir "escapar" da pasta public
  // usando algo como "../../../etc/passwd" na URL.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Acesso negado.');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); return res.end('Não encontrado.'); }
    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.css' ? 'text/css'
      : ext === '.js' ? 'application/javascript'
      : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`Servidor da NEXT SUPLEMENTOS rodando em http://localhost:${PORT}`);
});
