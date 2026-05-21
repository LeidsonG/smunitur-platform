-- ============================================================
-- Sistema Web SM Unitur
-- Schema do Banco de Dados MySQL
-- Criado em: 2026-05-10
-- ============================================================

CREATE DATABASE IF NOT EXISTS smunitur CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smunitur;

-- ------------------------------------------------------------
-- Tabela: usuarios_admin
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  senha      VARCHAR(255)  NOT NULL,
  nivel      ENUM('super_admin', 'admin', 'operador') NOT NULL DEFAULT 'operador',
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabela: categorias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(100) NOT NULL,
  slug  VARCHAR(100) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Dados iniciais de categorias
INSERT INTO categorias (nome, slug) VALUES
  ('Camisetas', 'camisetas'),
  ('Moletons',  'moletons'),
  ('Jalecos',   'jalecos');
-- Nota: novas categorias poderão ser adicionadas pelo painel admin

-- ------------------------------------------------------------
-- Tabela: produtos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS produtos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nome         VARCHAR(150) NOT NULL,
  descricao    TEXT,
  imagem       VARCHAR(255),
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- Tabela: orcamentos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamentos (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  numero            INT NOT NULL UNIQUE,
  nome_cliente      VARCHAR(100) NOT NULL,
  email_cliente     VARCHAR(150) NOT NULL,
  telefone_cliente  VARCHAR(20)  NOT NULL,
  cpf_cnpj          VARCHAR(20),
  produto_desejado  VARCHAR(150) NOT NULL,
  quantidade        INT UNSIGNED NOT NULL,
  tamanhos          VARCHAR(255),
  cores             VARCHAR(255),
  detalhes          TEXT,
  observacoes       TEXT,
  imagem_referencia VARCHAR(255),
  status            ENUM(
                      'recebido',
                      'em_analise',
                      'aguardando_aprovacao',
                      'em_producao',
                      'finalizado',
                      'enviado',
                      'cancelado'
                    ) NOT NULL DEFAULT 'recebido',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sequência de numeração de orçamentos (começa em 100)
-- O backend vai buscar MAX(numero) e somar 1; se não houver, usa 100
-- Inserir um registro base para garantir o início em 100
CREATE TABLE IF NOT EXISTS orcamento_sequencia (
  ultimo_numero INT NOT NULL DEFAULT 99
);
INSERT INTO orcamento_sequencia (ultimo_numero) VALUES (99);

-- ------------------------------------------------------------
-- Tabela: orcamento_status_historico
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamento_status_historico (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  orcamento_id    INT NOT NULL,
  status_anterior VARCHAR(50),
  status_novo     VARCHAR(50) NOT NULL,
  observacao      TEXT,
  usuario_id      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios_admin(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Tabela: atributos_produto
-- Atributos configuráveis por categoria (ex: "Tipo de Gola")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atributos_produto (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  produto_id  INT     NOT NULL,
  nome        VARCHAR(100) NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  ordem       INT     NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Tabela: opcoes_atributo
-- Opções de cada atributo (ex: "V", "Redonda", "Polo")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS opcoes_atributo (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  atributo_id INT     NOT NULL,
  valor       VARCHAR(100) NOT NULL,
  ordem       INT     NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (atributo_id) REFERENCES atributos_produto(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Tabela: orcamento_atributos
-- Seleções feitas pelo cliente em cada orçamento
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamento_atributos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  orcamento_id INT NOT NULL,
  atributo_id  INT NOT NULL,
  opcao_id     INT,
  valor_livre  VARCHAR(255),
  FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (atributo_id)  REFERENCES atributos_produto(id),
  FOREIGN KEY (opcao_id)     REFERENCES opcoes_atributo(id)
);

-- ------------------------------------------------------------
-- Usuário admin padrão (senha: Admin@1234 — TROCAR em produção!)
-- ------------------------------------------------------------
INSERT INTO usuarios_admin (nome, email, senha, nivel) VALUES (
  'Administrador',
  'admin@smunitur.com.br',
  '$2a$10$HcGbLHFXWQ/f1PZsPTWMPO2Q.MWpGRRLnvEEFj.UDdgiFCOCA1V0e',
  'super_admin'
);
-- ATENÇÃO: Altere a senha padrão imediatamente após o primeiro acesso!
