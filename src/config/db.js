const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    // ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = pool;