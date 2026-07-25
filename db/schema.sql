-- 고객 (회원가입 없음: 닉네임 + 휴대폰 뒷자리로 식별)
create table if not exists customers (
  id           serial primary key,
  nickname     text        not null,
  phone_last4  text        not null,
  address      text,
  memo         text,
  created_at   timestamptz not null default now(),
  unique (nickname, phone_last4)
);

-- 품목 마스터: 한 번 등록하면 계속 재사용하는 상품 목록
create table if not exists products (
  id            serial primary key,
  name          text        not null unique,
  unit          text        not null default '개',
  default_price integer     not null default 0,
  category      text,
  is_archived   boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- 판매일별 진열 목록: 매일 바뀌는 오늘의 품목 (마스터에서 꺼내 씀)
create table if not exists daily_items (
  id         serial primary key,
  sale_date  date    not null,
  product_id integer not null references products(id) on delete cascade,
  price      integer not null,
  limit_qty  integer,                       -- null 이면 수량 무제한
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  unique (sale_date, product_id)
);

create index if not exists daily_items_date_idx on daily_items (sale_date);

-- 주문
create table if not exists orders (
  id           serial primary key,
  customer_id  integer     not null references customers(id) on delete restrict,
  sale_date    date        not null,
  fulfillment  text        not null default 'pickup',    -- pickup | delivery
  pickup_time  text,                                     -- '15:30' 같은 자유 입력
  address      text,
  memo         text,
  total_amount integer     not null default 0,
  is_paid      boolean     not null default false,
  status       text        not null default 'confirmed', -- confirmed | cancelled
  source       text        not null default 'customer',  -- customer | admin
  created_at   timestamptz not null default now()
);

create index if not exists orders_date_idx on orders (sale_date desc, id desc);
create index if not exists orders_customer_idx on orders (customer_id, id desc);

-- 주문 상세 (품목명/단가는 주문 시점 값을 그대로 박제)
create table if not exists order_items (
  id            serial primary key,
  order_id      integer not null references orders(id) on delete cascade,
  daily_item_id integer references daily_items(id) on delete set null,
  product_id    integer references products(id) on delete set null,
  product_name  text    not null,
  unit          text    not null default '개',
  unit_price    integer not null,
  qty           integer not null,
  amount        integer not null
);

create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_daily_idx on order_items (daily_item_id);

-- 닉네임은 가게 전체에서 유일해야 한다 (고객이 명단에서 자기를 못 찾으면 안 되므로).
-- 대소문자만 다른 것도 같은 닉네임으로 본다.
create unique index if not exists customers_nickname_unique on customers (lower(nickname));

-- 고객이 직접 정하는 4자리 비밀번호 (원문은 저장하지 않고 키 해시만 보관)
alter table customers add column if not exists pin_hash text;
alter table customers add column if not exists pin_fail_count integer not null default 0;
alter table customers add column if not exists pin_locked_until timestamptz;

-- 세일가와 노출 구역.
-- sale_price 가 있고 시간대 안에 들어오면 그 가격으로 판다 (시간대가 비면 하루 종일).
-- highlight: timesale | limited | best — 고객 화면 위쪽 특별 구역에 어떻게 배치할지
alter table daily_items add column if not exists sale_price integer;
alter table daily_items add column if not exists sale_starts_at timestamptz;
alter table daily_items add column if not exists sale_ends_at timestamptz;
alter table daily_items add column if not exists highlight text;

-- 품목 사진. 업로드 시 정사각형으로 잘라 900px JPEG 으로 줄인 뒤 저장한다.
-- image_version 은 URL 캐시 무효화용 (사진을 바꾸면 +1 → 새 URL → CDN 이 새로 받아감)
alter table products add column if not exists image_data bytea;
alter table products add column if not exists image_type text;
alter table products add column if not exists image_version integer not null default 0;
