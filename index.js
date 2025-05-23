require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Conexão com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Criação da tabela se não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS perguntas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    departamento TEXT NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT,
    faq BOOLEAN DEFAULT FALSE,
    data TEXT
  )
`).catch(err => console.error('Erro ao criar tabela:', err));

// Rota principal
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`API funcionando! Hora do servidor: ${result.rows[0].now}`);
  } catch (err) {
    res.status(500).send("Erro ao conectar com o banco: " + err);
  }
});

// Enviar pergunta
app.post('/perguntas', async (req, res) => {
  const { nome, departamento, pergunta } = req.body;
  if (!nome || !departamento || !pergunta) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
  }

  const data = new Date().toLocaleString('pt-BR');
  try {
    const result = await pool.query(
      'INSERT INTO perguntas (nome, departamento, pergunta, data) VALUES ($1, $2, $3, $4) RETURNING id',
      [nome, departamento, pergunta, data]
    );
    res.json({ msg: 'Pergunta enviada com sucesso.', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Listar perguntas
app.get('/perguntas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM perguntas ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Listar perguntas por departamento
app.get('/perguntas/departamento/:departamento', async (req, res) => {
  const { departamento } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM perguntas WHERE departamento = $1 ORDER BY id DESC',
      [departamento]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Responder pergunta
app.post('/perguntas/:id/responder', async (req, res) => {
  const { id } = req.params;
  const { resposta } = req.body;
  if (!resposta) return res.status(400).json({ erro: 'Resposta vazia.' });

  try {
    await pool.query('UPDATE perguntas SET resposta = $1 WHERE id = $2', [resposta, id]);
    res.json({ msg: 'Resposta enviada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Apagar pergunta
app.delete('/perguntas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM perguntas WHERE id = $1', [id]);
    res.json({ msg: 'Pergunta apagada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Marcar/desmarcar como FAQ
app.post('/perguntas/:id/faq', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT faq FROM perguntas WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Pergunta não encontrada.' });

    const novoStatus = !result.rows[0].faq;
    await pool.query('UPDATE perguntas SET faq = $1 WHERE id = $2', [novoStatus, id]);
    res.json({ msg: novoStatus ? 'Pergunta marcada como FAQ.' : 'FAQ removido.' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Obter perguntas FAQ
app.get('/faq', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM perguntas WHERE faq = TRUE ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
