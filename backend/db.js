const mysql = require('mysql2/promise');
require('dotenv').config(); // ✅ dotenv 불러오기

async function initDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  return connection;
}

module.exports = initDB;