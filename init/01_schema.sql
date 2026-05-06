DROP VIEW IF EXISTS order_line_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;

CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  city TEXT,
  country TEXT,
  signup_date DATE,
  segment TEXT
);

CREATE TABLE products (
  product_id INT PRIMARY KEY,
  product_name TEXT,
  category TEXT,
  brand TEXT,
  unit_price NUMERIC(10,2),
  stock_quantity INT,
  is_active BOOLEAN
);

CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  product_id INT REFERENCES products(product_id),
  order_date DATE,
  quantity INT,
  discount_percent INT,
  status TEXT,
  payment_method TEXT
);

COPY customers (
  customer_id,
  first_name,
  last_name,
  email,
  city,
  country,
  signup_date,
  segment
)
FROM '/docker-entrypoint-initdb.d/customers.csv'
WITH (FORMAT csv, HEADER true);

COPY products (
  product_id,
  product_name,
  category,
  brand,
  unit_price,
  stock_quantity,
  is_active
)
FROM '/docker-entrypoint-initdb.d/products.csv'
WITH (FORMAT csv, HEADER true);

COPY orders (
  order_id,
  customer_id,
  product_id,
  order_date,
  quantity,
  discount_percent,
  status,
  payment_method
)
FROM '/docker-entrypoint-initdb.d/orders.csv'
WITH (FORMAT csv, HEADER true);

CREATE VIEW order_line_items AS
SELECT
  o.order_id,
  o.customer_id,
  o.product_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  p.product_name,
  p.category,
  o.order_date,
  o.quantity,
  o.discount_percent,
  p.unit_price,
  ROUND(o.quantity * p.unit_price, 2) AS total_before_discount,
  ROUND(o.quantity * p.unit_price * (1 - o.discount_percent / 100.0), 2) AS total_after_discount,
  o.status,
  o.payment_method
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN products p ON p.product_id = o.product_id;
