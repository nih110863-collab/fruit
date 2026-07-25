import 'server-only'

/**
 * 운영(Vercel + Neon)에서는 @neondatabase/serverless 를,
 * 로컬 개발에서 일반 Postgres 를 쓸 때는 pg 를 사용한다.
 * DATABASE_URL 의 호스트를 보고 알아서 고른다.
 */
const connectionString = process.env.DATABASE_URL ?? ''
const isNeon = /neon\.(tech|build|localtest\.me)/.test(connectionString)

if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.warn('[fruit] DATABASE_URL 이 없습니다. .env.local 을 확인해주세요.')
}

function required(): string {
  if (!connectionString) throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.')
  return connectionString
}

export type TxQuery = (text: string, params?: unknown[]) => Promise<any[]>

type Tagged = ((strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>) & {
  query: (text: string, params?: unknown[]) => Promise<any[]>
}

/* ---------- pg (로컬 개발용) ---------- */

const globalForPg = globalThis as unknown as { __fruitPgPool?: Promise<any> }

async function pgPool(): Promise<any> {
  if (!globalForPg.__fruitPgPool) {
    globalForPg.__fruitPgPool = import('pg').then((mod: any) => {
      const Pool = mod.Pool ?? mod.default?.Pool
      return new Pool({ connectionString: required(), max: 5 })
    })
  }
  return globalForPg.__fruitPgPool
}

function interpolate(strings: TemplateStringsArray, values: any[]): string {
  return strings.reduce((acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''), '')
}

const pgSql: Tagged = Object.assign(
  async (strings: TemplateStringsArray, ...values: any[]) => {
    const pool = await pgPool()
    const { rows } = await pool.query(interpolate(strings, values), values)
    return rows
  },
  {
    query: async (text: string, params?: unknown[]) => {
      const pool = await pgPool()
      const { rows } = await pool.query(text, params)
      return rows
    },
  },
)

/* ---------- neon (운영용) ---------- */

async function neonSqlFactory(): Promise<Tagged> {
  const { neon } = await import('@neondatabase/serverless')
  return neon(required()) as unknown as Tagged
}

const globalForNeon = globalThis as unknown as { __fruitNeonSql?: Promise<Tagged> }

const neonSql: Tagged = Object.assign(
  async (strings: TemplateStringsArray, ...values: any[]) => {
    globalForNeon.__fruitNeonSql ??= neonSqlFactory()
    return (await globalForNeon.__fruitNeonSql)(strings, ...values)
  },
  {
    query: async (text: string, params?: unknown[]) => {
      globalForNeon.__fruitNeonSql ??= neonSqlFactory()
      return (await globalForNeon.__fruitNeonSql).query(text, params)
    },
  },
)

/** 단발 쿼리용. 읽기와 단순 쓰기에 사용. */
export const sql: Tagged = isNeon ? neonSql : pgSql

/**
 * 트랜잭션이 필요한 작업용.
 * 수량 제한 품목은 동시 주문에서 초과 판매가 나면 안 되므로
 * daily_items 행을 FOR UPDATE 로 잠근 뒤 재고를 세고 주문을 넣는다.
 */
export async function withTx<T>(fn: (q: TxQuery) => Promise<T>): Promise<T> {
  const { client, done } = isNeon ? await neonClient() : await pgClient()
  try {
    await client.query('begin')
    const result = await fn((text, params) => client.query(text, params).then((r: any) => r.rows))
    await client.query('commit')
    return result
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  } finally {
    await done()
  }
}

async function pgClient() {
  const pool = await pgPool()
  const client = await pool.connect()
  return { client, done: async () => client.release() }
}

async function neonClient() {
  const { neonConfig, Pool } = await import('@neondatabase/serverless')
  const ws = (await import('ws')).default
  neonConfig.webSocketConstructor = ws
  const pool = new Pool({ connectionString: required() })
  const client = await pool.connect()
  return {
    client,
    done: async () => {
      client.release()
      await pool.end()
    },
  }
}
