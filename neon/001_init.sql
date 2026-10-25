-- Mandalaria D'ogum: esquema inicial para PostgreSQL no Neon.
-- Aplicar em um projeto de desenvolvimento antes de usar em produção.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_nonempty CHECK (length(trim(name)) > 0),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  materials text,
  width_cm numeric(7,2),
  height_cm numeric(7,2),
  depth_cm numeric(7,2),
  price_cents integer NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  made_to_order boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_name_nonempty CHECK (length(trim(name)) > 0),
  CONSTRAINT products_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT products_price_nonnegative CHECK (price_cents >= 0),
  CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0),
  CONSTRAINT products_status_valid CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT products_dimensions_positive CHECK (
    (width_cm IS NULL OR width_cm > 0) AND
    (height_cm IS NULL OR height_cm > 0) AND
    (depth_cm IS NULL OR depth_cm > 0)
  )
);
CREATE INDEX IF NOT EXISTS products_category_status_idx ON products(category_id, status);
CREATE INDEX IF NOT EXISTS products_active_featured_idx ON products(featured DESC, created_at DESC) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_media_kind_valid CHECK (kind IN ('image', 'glb', 'usdz')),
  CONSTRAINT product_media_url_nonempty CHECK (length(trim(url)) > 0)
);
CREATE INDEX IF NOT EXISTS product_media_product_order_idx ON product_media(product_id, sort_order);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject text UNIQUE,
  email text,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_email_unique_idx ON customers(lower(email)) WHERE email IS NOT NULL;

-- O servidor só pode conceder acesso após autenticação com e-mail verificado.
CREATE TABLE IF NOT EXISTS admin_memberships (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'editor',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_memberships_role_valid CHECK (role IN ('owner', 'editor')),
  CONSTRAINT admin_memberships_email_lowercase CHECK (email = lower(email))
);
INSERT INTO admin_memberships (email, role)
VALUES ('gb.mendonca21@gmail.com', 'owner')
ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending_payment',
  payment_status text NOT NULL DEFAULT 'pending',
  currency char(3) NOT NULL DEFAULT 'BRL',
  subtotal_cents integer NOT NULL,
  shipping_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL,
  shipping_address jsonb,
  customer_note text,
  payment_provider text,
  payment_reference text UNIQUE,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_status_valid CHECK (status IN ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  CONSTRAINT orders_payment_status_valid CHECK (payment_status IN ('pending', 'approved', 'rejected', 'refunded')),
  CONSTRAINT orders_totals_nonnegative CHECK (subtotal_cents >= 0 AND shipping_cents >= 0 AND total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS orders_customer_created_idx ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL,
  line_total_cents integer NOT NULL,
  CONSTRAINT order_items_positive CHECK (unit_price_cents >= 0 AND quantity > 0 AND line_total_cents >= 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Eventos de pagamento são guardados para processamento idempotente do webhook.
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_event_id text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS custom_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  product_type text NOT NULL,
  colors text NOT NULL,
  approximate_size text,
  desired_date date,
  budget_range text,
  details text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_requests_status_valid CHECK (status IN ('new', 'contacted', 'quoted', 'accepted', 'closed'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
