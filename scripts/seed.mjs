import { createClient } from './client.mjs'

const { sql, close } = await createClient()

const products = [
  ['사과 (부사)', '봉', 12000, '과일'],
  ['샤인머스캣', '송이', 15000, '과일'],
  ['방울토마토', '팩', 6000, '과일'],
  ['깐마늘', '팩', 5000, '채소'],
  ['대파', '단', 3500, '채소'],
  ['애호박', '개', 2000, '채소'],
  ['계란 (특란)', '판', 8500, '기타'],
  ['두부', '모', 2500, '기타'],
]

for (const [name, unit, price, category] of products) {
  await sql`
    insert into products (name, unit, default_price, category)
    values (${name}, ${unit}, ${price}, ${category})
    on conflict (name) do nothing
  `
}

const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
const rows = await sql`select id, default_price from products order by id limit 5`

let i = 0
for (const p of rows) {
  await sql`
    insert into daily_items (sale_date, product_id, price, limit_qty, sort_order)
    values (${today}, ${p.id}, ${p.default_price}, ${i === 0 ? 3 : null}, ${i})
    on conflict (sale_date, product_id) do nothing
  `
  i++
}

await close()
console.log(`샘플 품목 ${products.length}개 등록 / ${today} 판매목록 ${rows.length}개 구성 완료`)
