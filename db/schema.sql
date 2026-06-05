CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  user_login_id VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('consumer','seller')),
  notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notify_1day BOOLEAN NOT NULL DEFAULT TRUE,
  notify_3day BOOLEAN NOT NULL DEFAULT TRUE,
  notify_7day BOOLEAN NOT NULL DEFAULT TRUE,
  notify_discount BOOLEAN NOT NULL DEFAULT TRUE,
  fcm_token VARCHAR(300),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(user_login_id);

CREATE TABLE IF NOT EXISTS seller_info (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(200) NOT NULL,
  business_number VARCHAR(20) NOT NULL UNIQUE,
  store_zipcode VARCHAR(10),
  store_address VARCHAR(300),
  store_address_detail VARCHAR(200),
  store_latitude DOUBLE PRECISION,
  store_longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_seller_info_updated ON seller_info;
CREATE TRIGGER trg_seller_info_updated
BEFORE UPDATE ON seller_info
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seller_location ON seller_info(store_latitude, store_longitude);

CREATE TABLE IF NOT EXISTS addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zipcode VARCHAR(10) NOT NULL,
  address VARCHAR(300) NOT NULL,
  address_detail VARCHAR(200),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  address_type VARCHAR(20) NOT NULL DEFAULT 'home' CHECK (address_type IN ('home','office','etc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uix_addresses_default ON addresses(user_id) WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS food_items (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit VARCHAR(20),
  expiry_date DATE,
  registered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_food_items_updated ON food_items;
CREATE TRIGGER trg_food_items_updated
BEFORE UPDATE ON food_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_food_items_expiry ON food_items(owner_id, expiry_date ASC) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS discount_info (
  id BIGSERIAL PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_name VARCHAR(200) NOT NULL,
  original_price INTEGER NOT NULL CHECK (original_price > 0),
  discount_price INTEGER NOT NULL CHECK (discount_price >= 0),
  discount_rate SMALLINT GENERATED ALWAYS AS (
    ROUND(((original_price - discount_price)::NUMERIC / original_price) * 100)::SMALLINT
  ) STORED,
  description TEXT,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_discount_updated ON discount_info;
CREATE TRIGGER trg_discount_updated
BEFORE UPDATE ON discount_info
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_discount_active ON discount_info(is_active, created_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_discount_seller ON discount_info(seller_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_item_id BIGINT REFERENCES food_items(id) ON DELETE SET NULL,
  discount_id BIGINT REFERENCES discount_info(id) ON DELETE SET NULL,
  notify_type VARCHAR(20) NOT NULL CHECK (notify_type IN ('expiry_1d','expiry_3d','expiry_7d','discount')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_notify_log_user ON notification_log(user_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS recipe_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id VARCHAR(50) NOT NULL,
  recipe_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, recipe_id)
);

CREATE OR REPLACE VIEW v_discount_with_location AS
SELECT
  d.id,
  d.seller_id,
  d.food_name,
  d.original_price,
  d.discount_price,
  d.discount_rate,
  d.description,
  d.expiry_date,
  d.created_at,
  s.business_name,
  s.store_address,
  s.store_latitude,
  s.store_longitude
FROM discount_info d
JOIN seller_info s ON d.seller_id = s.user_id
WHERE d.is_active = TRUE
  AND (d.expiry_date IS NULL OR d.expiry_date >= CURRENT_DATE);

CREATE OR REPLACE VIEW v_expiry_alerts AS
SELECT
  f.id AS food_id,
  f.owner_id AS user_id,
  f.food_name,
  f.expiry_date,
  (f.expiry_date - CURRENT_DATE) AS days_remaining,
  u.fcm_token,
  u.notify_enabled,
  u.notify_1day,
  u.notify_3day,
  u.notify_7day
FROM food_items f
JOIN users u ON f.owner_id = u.id
WHERE f.is_deleted = FALSE
  AND u.notify_enabled = TRUE
  AND f.expiry_date >= CURRENT_DATE
  AND (f.expiry_date - CURRENT_DATE) IN (1, 3, 7);
