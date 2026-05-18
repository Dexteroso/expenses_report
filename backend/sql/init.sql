SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  onboarding_completed TINYINT(1) NOT NULL DEFAULT 0,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS accounts (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  last_four VARCHAR(4) DEFAULT NULL,
  account_alias VARCHAR(120) GENERATED ALWAYS AS (CONCAT(bank_name, _utf8mb4'_', last_four)) STORED,
  account_type ENUM('debit', 'credit', 'cash', 'transfer', 'investment', 'other') NOT NULL,
  billing_cycle_end_day TINYINT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  CONSTRAINT accounts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS concepts (
  id INT NOT NULL AUTO_INCREMENT,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY category_id (category_id),
  CONSTRAINT concepts_ibfk_1 FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id INT NOT NULL AUTO_INCREMENT,
  expense_code VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  category_id INT NOT NULL,
  concept_id INT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  account_id INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY expense_code (expense_code),
  KEY user_id (user_id),
  KEY category_id (category_id),
  KEY concept_id (concept_id),
  KEY account_id (account_id),
  CONSTRAINT expenses_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT expenses_ibfk_2 FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT expenses_ibfk_3 FOREIGN KEY (concept_id) REFERENCES concepts (id),
  CONSTRAINT expenses_ibfk_4 FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS budgets (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  concept_id INT NOT NULL,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_id (user_id, concept_id, year, month),
  KEY concept_id (concept_id),
  CONSTRAINT budgets_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT budgets_ibfk_2 FOREIGN KEY (concept_id) REFERENCES concepts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS favorite_movements (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  emoji VARCHAR(16) NOT NULL,
  alias VARCHAR(40) NOT NULL,
  color VARCHAR(20) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  category_id INT NOT NULL,
  concept_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  account_id INT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id),
  KEY category_id (category_id),
  KEY concept_id (concept_id),
  KEY account_id (account_id),
  CONSTRAINT favorite_movements_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT favorite_movements_ibfk_2 FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT favorite_movements_ibfk_3 FOREIGN KEY (concept_id) REFERENCES concepts (id),
  CONSTRAINT favorite_movements_ibfk_4 FOREIGN KEY (account_id) REFERENCES accounts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO categories (id, name, type) VALUES
  (1, 'Ahorros e Inversiones', 'expense'),
  (2, 'Alimentos', 'expense'),
  (3, 'Artículos Personales', 'expense'),
  (4, 'Cuidado de Mascotas', 'expense'),
  (5, 'Cuidado Personal', 'expense'),
  (6, 'Educación', 'expense'),
  (7, 'Entretenimiento', 'expense'),
  (8, 'Impuestos', 'expense'),
  (9, 'Ingresos', 'income'),
  (10, 'Misceláneos', 'expense'),
  (11, 'Pagos de Deuda', 'expense'),
  (12, 'Seguros', 'expense'),
  (13, 'Transporte', 'expense'),
  (14, 'Viajes', 'expense'),
  (15, 'Vivienda', 'expense');

INSERT IGNORE INTO concepts (id, category_id, name) VALUES
  (1, 1, 'Ahorro para el Retiro'),
  (2, 1, 'Fondo de Emergencia'),
  (3, 1, 'Inversiones/Acciones'),
  (4, 2, 'Supermercado'),
  (5, 2, 'Delivery/Restaurantes'),
  (6, 2, 'Antojos/Snacks'),
  (7, 2, 'Suscripciones'),
  (8, 3, 'Ropa'),
  (9, 3, 'Calzado'),
  (10, 3, 'Accesorios'),
  (11, 4, 'Alimento y Bocadillos'),
  (12, 4, 'Salud y Bienestar'),
  (13, 4, 'Productos de Higiene'),
  (14, 4, 'Guardería'),
  (15, 5, 'Salud y Bienestar'),
  (16, 5, 'Membresías'),
  (17, 5, 'Productos de Higiene Personal'),
  (18, 6, 'Matrícula'),
  (19, 6, 'Útiles Escolares'),
  (20, 6, 'Otros'),
  (21, 7, 'Servicios de Streaming'),
  (22, 7, 'Servicios en la Nube'),
  (23, 7, 'Suscripciones'),
  (24, 7, 'Pasatiempos'),
  (25, 7, 'Cine/Conciertos'),
  (26, 8, 'Impuesto sobre la Renta'),
  (27, 8, 'Impuesto Predial'),
  (28, 8, 'Tenencia'),
  (29, 8, 'Otros Impuestos (si aplica)'),
  (30, 9, 'Salario'),
  (31, 9, 'Devolución de Impuestos'),
  (32, 9, 'Pago de Préstamos'),
  (33, 9, 'Ingresos Inesperados'),
  (34, 9, 'Rentas'),
  (35, 10, 'Regalos y Obsequios'),
  (36, 10, 'Donaciones'),
  (37, 10, 'Gastos Inesperados'),
  (38, 11, 'Tarjeta de Crédito'),
  (39, 11, 'Préstamos Personales'),
  (40, 11, 'Anualidad'),
  (41, 12, 'Seguro Médico'),
  (42, 12, 'Seguro de Vida'),
  (43, 12, 'Seguro de Auto'),
  (44, 12, 'Otros Seguros'),
  (45, 13, 'Pagos (Compra/Arrendamiento)'),
  (46, 13, 'Combustible'),
  (47, 13, 'Mantenimiento y Reparaciones'),
  (48, 13, 'Estacionamiento/Peajes'),
  (49, 13, 'Transporte Público'),
  (50, 14, 'Alimentos'),
  (51, 14, 'Vuelos/Transporte'),
  (52, 14, 'Alojamiento'),
  (53, 15, 'Renta'),
  (54, 15, 'Comisión de Renta'),
  (55, 15, 'Reparaciones y Mantenimiento'),
  (56, 15, 'Electricidad'),
  (57, 15, 'Gas'),
  (58, 15, 'Agua'),
  (59, 15, 'Teléfono'),
  (60, 15, 'Internet/Cable'),
  (61, 15, 'Otros');

INSERT IGNORE INTO users (id, name, email, password, role, is_active, onboarding_completed) VALUES
  (1, 'Admin Demo', 'admin.docker@example.com', '$2b$10$lttlitklg0Pu/6YiARfNUeweej.ywkBDxxizdxdXYlK480CLvcKF2', 'admin', 1, 1);

INSERT IGNORE INTO accounts (id, user_id, bank_name, last_four, account_type, billing_cycle_end_day, is_active) VALUES
  (1, 1, 'BBVA', '1234', 'debit', NULL, 1),
  (2, 1, 'Santander', '4603', 'credit', 15, 1);

INSERT IGNORE INTO favorite_movements (
  id,
  user_id,
  emoji,
  alias,
  color,
  type,
  category_id,
  concept_id,
  description,
  account_id
) VALUES
  (1, 1, '🛒', 'Súper', '#2f7d5f', 'expense', 2, 4, 'Supermercado semanal', 2),
  (2, 1, '⛽', 'Gasolina', '#d97706', 'expense', 13, 46, 'Gasolina', 2),
  (3, 1, '💳', 'Nómina', '#2f6fd6', 'income', 9, 30, 'Nómina', 1);

INSERT IGNORE INTO budgets (user_id, concept_id, year, month, amount) VALUES
  (1, 30, 2026, 1, 65000.00),
  (1, 30, 2026, 2, 65000.00),
  (1, 30, 2026, 3, 65000.00),
  (1, 30, 2026, 4, 65000.00),
  (1, 30, 2026, 5, 65000.00),
  (1, 4, 2026, 5, 8000.00),
  (1, 5, 2026, 5, 2500.00),
  (1, 21, 2026, 5, 600.00),
  (1, 38, 2026, 5, 5000.00),
  (1, 46, 2026, 5, 3000.00),
  (1, 51, 2026, 5, 6000.00),
  (1, 53, 2026, 5, 15000.00),
  (1, 60, 2026, 5, 800.00),
  (1, 4, 2026, 1, 7600.00),
  (1, 4, 2026, 2, 7600.00),
  (1, 4, 2026, 3, 7800.00),
  (1, 4, 2026, 4, 8000.00),
  (1, 53, 2026, 1, 15000.00),
  (1, 53, 2026, 2, 15000.00),
  (1, 53, 2026, 3, 15000.00),
  (1, 53, 2026, 4, 15000.00);

INSERT IGNORE INTO expenses (
  id,
  expense_code,
  user_id,
  date,
  type,
  category_id,
  concept_id,
  description,
  amount,
  account_id
) VALUES
  (1, 'EX260001', 1, '2026-05-01', 'income', 9, 30, 'Nómina mayo', 65000.00, 1),
  (2, 'EX260002', 1, '2026-05-03', 'expense', 15, 53, 'Renta departamento', 15000.00, 1),
  (3, 'EX260003', 1, '2026-05-05', 'expense', 2, 4, 'Supermercado semanal', 1200.00, 2),
  (4, 'EX260004', 1, '2026-05-07', 'expense', 13, 46, 'Gasolina', 900.00, 2),
  (5, 'EX260005', 1, '2026-05-09', 'expense', 7, 21, 'Streaming mensual', 299.00, 2),
  (6, 'EX260006', 1, '2026-05-10', 'expense', 2, 5, 'Cena familiar', 550.00, 2),
  (7, 'EX260007', 1, '2026-05-11', 'expense', 15, 60, 'Internet mensual', 750.00, 1),
  (8, 'EX260008', 1, '2026-05-12', 'expense', 11, 38, 'Pago tarjeta', 2800.00, 2),
  (9, 'EX260009', 1, '2026-05-12', 'expense', 14, 51, 'Vuelo Monterrey CDMX', 4500.00, 2),
  (10, 'EX260010', 1, '2026-04-01', 'income', 9, 30, 'Nómina abril', 65000.00, 1),
  (11, 'EX260011', 1, '2026-04-04', 'expense', 2, 4, 'Supermercado abril', 3400.00, 2),
  (12, 'EX260012', 1, '2026-04-05', 'expense', 15, 53, 'Renta abril', 15000.00, 1);

ALTER TABLE categories AUTO_INCREMENT = 16;
ALTER TABLE concepts AUTO_INCREMENT = 62;
ALTER TABLE users AUTO_INCREMENT = 2;
ALTER TABLE accounts AUTO_INCREMENT = 3;
ALTER TABLE favorite_movements AUTO_INCREMENT = 4;
ALTER TABLE expenses AUTO_INCREMENT = 13;
ALTER TABLE budgets AUTO_INCREMENT = 22;
