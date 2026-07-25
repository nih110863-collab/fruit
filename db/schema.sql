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
