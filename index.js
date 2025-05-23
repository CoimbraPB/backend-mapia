require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

// Conexão com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Heroku precisa disso
  },
});

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`API funcionando! Hora do servidor: ${result.rows[0].now}`);
  } catch (err) {
    res.status(500).send("Erro ao conectar com o banco: " + err);
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
