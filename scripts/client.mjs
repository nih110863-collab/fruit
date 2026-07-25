/**
 * migrate / seed 스크립트용 DB 클라이언트.
 * Neon 주소면 @neondatabase/serverless, 아니면 pg 를 쓴다.
 */
export async function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL 이 없습니다. .env.local 에 넣어주세요.')
    process.exit(1)
  }

  if (/neon\.(tech|build)/.test(url)) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(url)
    return { sql, query: (text, params) => sql.query(text, params), close: async () => {} }
  }

  const pg = await import('pg')
  const Pool = pg.Pool ?? pg.default.Pool
  const pool = new Pool({ connectionString: url })
  const sql = async (strings, ...values) => {
    const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ''), '')
    const { rows } = await pool.query(text, values)
    return rows
  }
  return {
    sql,
    query: async (text, params) => (await pool.query(text, params)).rows,
    close: () => pool.end(),
  }
}
