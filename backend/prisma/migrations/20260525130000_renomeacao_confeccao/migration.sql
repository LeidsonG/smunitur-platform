-- Renomeação para terminologia da indústria de confecção:
--   Categoria → Linha   |   Produto → Modelo
--   Atributo → Especificacao   |   OpcaoAtributo → Variacao (modelo: ModeloVariacao)
--   ProdutoAtributo → ModeloEspecificacao
--   ProdutoAtributoOpcao → ModeloEspecificacaoVariacao
--   OrcamentoAtributo → OrcamentoEspecificacao
--
-- Estratégia: RENAME TABLE + ALTER TABLE CHANGE COLUMN. Preserva dados
-- existentes. As FK constraints do MySQL acompanham os renames de colunas
-- automaticamente quando feitos via CHANGE COLUMN.

-- 1. Renomear tabelas
RENAME TABLE
  `categorias` TO `linhas`,
  `produtos` TO `modelos`,
  `atributos` TO `especificacoes`,
  `opcoes_atributo` TO `variacoes`,
  `produto_atributos` TO `modelo_especificacoes`,
  `produto_atributo_opcoes` TO `modelo_especificacao_variacoes`,
  `orcamento_atributos` TO `orcamento_especificacoes`;

-- 2. Renomear colunas FK e campos chave
ALTER TABLE `modelos`
  CHANGE COLUMN `categoria_id` `linha_id` INT NOT NULL;

ALTER TABLE `variacoes`
  CHANGE COLUMN `atributo_id` `especificacao_id` INT NOT NULL;

ALTER TABLE `modelo_especificacoes`
  CHANGE COLUMN `produto_id` `modelo_id` INT NOT NULL,
  CHANGE COLUMN `atributo_id` `especificacao_id` INT NOT NULL;

ALTER TABLE `modelo_especificacao_variacoes`
  CHANGE COLUMN `produto_atributo_id` `modelo_especificacao_id` INT NOT NULL,
  CHANGE COLUMN `opcao_id` `variacao_id` INT NOT NULL;

ALTER TABLE `orcamento_especificacoes`
  CHANGE COLUMN `produto_atributo_id` `modelo_especificacao_id` INT NULL,
  CHANGE COLUMN `opcao_id` `variacao_id` INT NULL;

ALTER TABLE `orcamentos`
  CHANGE COLUMN `produto_desejado` `modelo_desejado` VARCHAR(150) NOT NULL;
