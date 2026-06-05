import fs from 'node:fs/promises'
import dotenv from 'dotenv'
import { pool } from './db.js'

dotenv.config()

const file = process.argv[2]

if (!file) {
  console.error('Usage: node server/run-sql.js <sql-file>')
  process.exit(1)
}

try {
  const sql = await fs.readFile(file, 'utf-8')
  await pool.query(sql)
  console.log(`Applied ${file}`)
} finally {
  await pool.end()
}
