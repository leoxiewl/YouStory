import { defineConfig } from 'drizzle-kit'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  schema: path.join(__dirname, './src/db/schema.ts'),
  out: path.join(__dirname, './src/db/migrations'),
  dialect: 'sqlite',
  dbCredentials: {
    url: path.join(__dirname, '../../data/youstorys.sqlite'),
  },
})
