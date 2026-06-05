create table if not exists users (
    id bigserial primary key,
    user_login_id text unique,
    user_id text,
    password_hash text not null,
    name text not null,
    role text not null,
    can_create_food boolean default true,
    can_update_food boolean default true,
    can_delete_food boolean default true,
    can_read_food boolean default true,
    can_manage_notification boolean default true,
    can_manage_address boolean default true,
    can_view_sale boolean default true,
    can_view_recipe boolean default true,
    business_number text,
    business_name text,
    representative_name text,
    business_category text,
    market_type text,
    address text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists food_items (
    id bigserial primary key,
    owner_id bigint,
    seller_id bigint,
    food_name text,
    item_name text,
    category text,
    subcategory text,
    emoji text,
    quantity integer,
    unit text,
    price numeric(12, 2) default 0,
    expiry_date date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists sale_info (
    id bigserial primary key,
    seller_id bigint,
    food_id bigint,
    original_price numeric(12, 2),
    sale_price numeric(12, 2),
    discount_rate integer,
    start_date date,
    end_date date,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table users add column if not exists user_login_id text;
alter table users add column if not exists user_id text;
alter table food_items add column if not exists owner_id bigint;
alter table food_items add column if not exists seller_id bigint;
alter table food_items add column if not exists food_name text;
alter table food_items add column if not exists item_name text;
alter table food_items add column if not exists category text;
alter table food_items add column if not exists subcategory text;
alter table food_items add column if not exists emoji text;
alter table food_items add column if not exists expiry_date date;
alter table food_items alter column expiry_date drop not null;
alter table sale_info add column if not exists seller_id bigint;
alter table sale_info add column if not exists food_id bigint;
alter table sale_info add column if not exists original_price numeric(12, 2);
alter table sale_info add column if not exists sale_price numeric(12, 2);
alter table sale_info add column if not exists discount_rate integer;
alter table sale_info add column if not exists start_date date;
alter table sale_info add column if not exists end_date date;

update users set user_login_id = user_id where user_login_id is null and user_id is not null;
update users set user_id = user_login_id where user_id is null and user_login_id is not null;
update food_items set owner_id = seller_id where owner_id is null and seller_id is not null;
update food_items set seller_id = owner_id where seller_id is null and owner_id is not null;
update food_items set food_name = item_name where food_name is null and item_name is not null;
update food_items set item_name = food_name where item_name is null and food_name is not null;
