-- Migration consolidada que reflete o estado completo do schema.prisma
-- (incluindo tabelas que eram criadas via `db push` em dev sem estar
-- versionadas: atributos, opcoes_atributo, produto_atributos,
-- produto_atributo_opcoes, orcamento_atributos; e o campo valor em
-- orcamentos, ativo em atributos, tokenVersion em usuarios_admin).
--
-- Substitui a migration anterior 20260510000000_init.
--
-- Bancos novos: rodar `npx prisma migrate deploy` aplica tudo.
-- Bancos com tabelas já criadas via db push:
--   1. `npx prisma migrate resolve --applied 20260524000000_init`
--   2. depois `npx prisma migrate deploy` para futuras alterações.

-- CreateTable
CREATE TABLE `usuarios_admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `nivel` ENUM('super_admin', 'admin', 'operador') NOT NULL DEFAULT 'operador',
    `foto` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `token_version` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_admin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `categorias_nome_key`(`nome`),
    UNIQUE INDEX `categorias_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produtos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoria_id` INTEGER NOT NULL,
    `nome` VARCHAR(150) NOT NULL,
    `descricao` TEXT NULL,
    `imagem` VARCHAR(255) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `produtos_categoria_id_nome_key`(`categoria_id`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `atributos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `atributos_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opcoes_atributo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `atributo_id` INTEGER NOT NULL,
    `valor` VARCHAR(100) NOT NULL,
    `imagem` VARCHAR(255) NULL,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `opcoes_atributo_atributo_id_valor_key`(`atributo_id`, `valor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produto_atributos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `produto_id` INTEGER NOT NULL,
    `atributo_id` INTEGER NOT NULL,
    `obrigatorio` BOOLEAN NOT NULL DEFAULT false,
    `ordem` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `produto_atributos_produto_id_atributo_id_key`(`produto_id`, `atributo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produto_atributo_opcoes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `produto_atributo_id` INTEGER NOT NULL,
    `opcao_id` INTEGER NOT NULL,

    UNIQUE INDEX `produto_atributo_opcoes_produto_atributo_id_opcao_id_key`(`produto_atributo_id`, `opcao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `numero` INTEGER NOT NULL,
    `nome_cliente` VARCHAR(100) NOT NULL,
    `email_cliente` VARCHAR(150) NOT NULL,
    `telefone_cliente` VARCHAR(20) NOT NULL,
    `cpf_cnpj` VARCHAR(20) NULL,
    `produto_desejado` VARCHAR(150) NOT NULL,
    `quantidade` INTEGER UNSIGNED NOT NULL,
    `tamanhos` VARCHAR(255) NULL,
    `cores` VARCHAR(255) NULL,
    `detalhes` TEXT NULL,
    `observacoes` TEXT NULL,
    `imagem_referencia` VARCHAR(255) NULL,
    `valor` DECIMAL(10, 2) NULL,
    `status` ENUM('recebido', 'em_analise', 'aguardando_aprovacao', 'em_producao', 'finalizado', 'enviado', 'cancelado') NOT NULL DEFAULT 'recebido',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orcamentos_numero_key`(`numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamento_atributos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orcamento_id` INTEGER NOT NULL,
    `produto_atributo_id` INTEGER NULL,
    `opcao_id` INTEGER NULL,
    `valor_livre` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orcamento_status_historico` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orcamento_id` INTEGER NOT NULL,
    `status_anterior` VARCHAR(50) NULL,
    `status_novo` VARCHAR(50) NOT NULL,
    `observacao` TEXT NULL,
    `usuario_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_categoria_id_fkey`
    FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opcoes_atributo` ADD CONSTRAINT `opcoes_atributo_atributo_id_fkey`
    FOREIGN KEY (`atributo_id`) REFERENCES `atributos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_atributos` ADD CONSTRAINT `produto_atributos_produto_id_fkey`
    FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_atributos` ADD CONSTRAINT `produto_atributos_atributo_id_fkey`
    FOREIGN KEY (`atributo_id`) REFERENCES `atributos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_atributo_opcoes` ADD CONSTRAINT `produto_atributo_opcoes_produto_atributo_id_fkey`
    FOREIGN KEY (`produto_atributo_id`) REFERENCES `produto_atributos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_atributo_opcoes` ADD CONSTRAINT `produto_atributo_opcoes_opcao_id_fkey`
    FOREIGN KEY (`opcao_id`) REFERENCES `opcoes_atributo`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_atributos` ADD CONSTRAINT `orcamento_atributos_orcamento_id_fkey`
    FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- SetNull preserva o histórico do orçamento mesmo se o atributo/opção for
-- removido posteriormente.
ALTER TABLE `orcamento_atributos` ADD CONSTRAINT `orcamento_atributos_produto_atributo_id_fkey`
    FOREIGN KEY (`produto_atributo_id`) REFERENCES `produto_atributos`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_atributos` ADD CONSTRAINT `orcamento_atributos_opcao_id_fkey`
    FOREIGN KEY (`opcao_id`) REFERENCES `opcoes_atributo`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_status_historico` ADD CONSTRAINT `orcamento_status_historico_orcamento_id_fkey`
    FOREIGN KEY (`orcamento_id`) REFERENCES `orcamentos`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orcamento_status_historico` ADD CONSTRAINT `orcamento_status_historico_usuario_id_fkey`
    FOREIGN KEY (`usuario_id`) REFERENCES `usuarios_admin`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
