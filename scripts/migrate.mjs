import { readFile } from 'node:fs/promises'
import { createClient } from './client.mjs'

const db = await createClient()
const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8')

// 세미콜론 단위로 잘라 한 문장씩 실행 (neon http 드라이버는 다중 문장을 못 받음)
const statements = schema
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s && !s.split('\n').every((l) => l.trim().startsWith('--')))

for (const stmt of statements) {
  await db.query(stmt)
  console.log('✓', stmt.replace(/\s+/g, ' ').slice(0, 70))
}

await db.close()
console.log(`\n완료: ${statements.length}개 문장 실행됨`)
