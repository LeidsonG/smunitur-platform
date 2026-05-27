# Próximas Funcionalidades — Sistema SM Unitur

Funcionalidades planejadas **após o lançamento da versão atual**. Cada item tem contexto, decisões já tomadas, perguntas pendentes para o cliente e estimativa relativa.

A versão atual foca em estabilidade, segurança e operação. As próximas trazem regras de negócio mais ricas — mas só implementar depois de validar o que realmente é necessário com o pessoal da SM Unitur.

---

## R1 — Cliente como entidade própria

**Hoje**: cada orçamento copia `nome_cliente`, `email_cliente`, `telefone_cliente`, `cpf_cnpj`. Cliente recorrente recadastra tudo. Não há análise "top clientes".

**Proposta**: nova tabela `Cliente` com FK em `Orcamento.clienteId`. Form do site faz upsert por e-mail (ou telefone, ou CPF) — se já existe, reaproveita.

**Decisões tomadas**: nenhuma — aguardar validação com cliente.

**Perguntas para a SM Unitur**:
- [ ] Há quantos clientes únicos hoje? (volume aproximado)
- [ ] Cliente costuma fazer vários pedidos? Querem ver "histórico do cliente João"?
- [ ] Identificador único preferido: e-mail, telefone ou CPF/CNPJ?
- [ ] PJ é mais comum que PF? Querem campo separado de razão social?
- [ ] LGPD: tem política de retenção de dados (deletar cliente inativo após X anos)?

**Tamanho estimado**: M (migration + form upsert + listagem básica)

---

## R2 — Prazo de entrega no orçamento

**Hoje**: orçamento tem `created_at`, mas nada sobre quando o cliente precisa receber. Fábrica não sabe priorizar.

**Proposta**:
- Campo `dataEntregaDesejada` (cliente preenche no form, opcional)
- Flag `urgente: Boolean` (cliente pode marcar — opcional)
- Campo `prazoConfirmado` (admin define ao orçar)
- Cor/badge no painel de produção indicando urgência

**Perguntas para a SM Unitur**:
- [ ] Prazo típico de produção (em dias úteis): camiseta básica? polo? jaleco? moletom?
- [ ] Aceita pedido com prazo apertado (ex.: 5 dias)? Tem taxa de urgência?
- [ ] Cliente costuma já chegar com data em mente, ou negocia depois?

**Tamanho estimado**: S

---

## R9 — Notificação automática ao mudar status

**Hoje**: cliente só descobre nova etapa se entrar em `/acompanhar/:numero`. Nada chega ativamente para ele.

**Decisão tomada**: usar **Resend** (free até 3.000 e-mails/mês, SDK simples).

**Proposta**:
- Hook em `PATCH /orcamentos/:id/status` que dispara e-mail para `emailCliente` com template HTML.
- Configurável: habilitar/desabilitar por status (ex.: só enviar em `em_producao`, `finalizado`, `enviado`).
- Configurar domínio da SM Unitur no Resend (DKIM/SPF) para entregabilidade.

**Perguntas para a SM Unitur**:
- [ ] Em quais status o cliente deve ser notificado? Todos ou só alguns?
- [ ] Quem assina o e-mail (nome remetente)? Ex.: "SM Unitur — Atendimento"
- [ ] Têm um e-mail corporativo no domínio (para `noreply@smunitur.com.br`)?
- [ ] Preferem template visual elaborado ou mensagem simples em texto?

**Tamanho estimado**: M (integração Resend + 1 template + flag de configuração)

---

## R10 — FK forte de modelo/linha no orçamento

**Hoje**: `Orcamento.modeloDesejado` é VARCHAR sem FK. Cliente que escolheu "Outros" digita texto livre.

**Proposta**:
- Adicionar `modeloId Int?` (nullable, para acomodar "Outros")
- Adicionar `linhaId Int?`
- Manter `modeloDesejado` como texto descritivo (snapshot) — útil para histórico mesmo se modelo for removido
- Habilita estatísticas confiáveis no dashboard: "modelo mais pedido", "linha com mais demanda"

**Tamanho estimado**: S (migration trivial + adaptação no form de criação + 1 gráfico extra no dashboard)

---

## R11 — Anexar layout final + visualização pelo cliente ✅ ENTREGUE

Implementado na versão atual (abordagem semi-automática de 1 clique):
- Campo `Orcamento.layoutFinal` no schema + rota `PUT /api/orcamentos/:id/layout-final`
  (upload com validação de magic bytes + resize via sharp).
- Em `/admin/orcamentos`, o admin sobe o layout e dispara um link `wa.me` pré-formatado.
- Em `/#acompanhar`, o cliente visualiza o layout final aprovado pela equipe.

**Evoluções possíveis (não implementadas)**: múltiplos anexos por orçamento, suporte a
PDF/AI, e botão de aprovar/rejeitar pelo próprio sistema (com mudança automática de status).

---

## Outras melhorias avaliadas e PULADAS por enquanto

| ID | Item | Por que pular |
|----|------|---------------|
| R3 | Etapas granulares de produção (modelagem/corte/costura/...) | Cliente disse "preço final ou por peça quando terminar o orçamento" — etapas detalhadas não são necessárias |
| R4 | Responsável por etapa de produção | Mesmo motivo de R3 |
| R5 | Preço base por modelo + por variação | Cliente disse "preço apenas no fim do orçamento". O campo `Orcamento.valor` (já existente) cobre. |
| R6 | Matriz estruturada de tamanhos no banco | Cliente já alterou para caixas com quantidade no front. String concatenada no banco é suficiente para o fluxo dele. |
| R7 | Paleta de cores padronizada | Aguardando a fábrica enviar a paleta especial. Fica como sub-tarefa quando chegar. |
| R8 | Notas internas separadas das do cliente | Cliente confirmou que não há equipe interna usando o admin para conversar entre si. |

---

## Sugestões adicionais (baixa prioridade)

- **Exportação Excel/PDF** dos orçamentos (pedido comum de cliente final)
- **Soft delete** em entidades principais (auditoria)
- **Busca** em `/admin/modelos` e `/admin/especificacoes`
- **Testes automatizados** mínimos (rotas críticas: criar orçamento, login, status)
- **Dashboard com mais métricas**: ticket médio (mês), taxa de conversão (orçamentos vs. fechados), tempo médio em produção
- **Dark mode** no admin (opcional)
- **Login do cliente** leve (por código de orçamento + e-mail) para área "Meus pedidos"
- **Logs estruturados centralizados** (envio pro Grafana/Datadog) se o volume crescer

---

## Ordem sugerida quando começar essas funcionalidades

1. **R10** (FK modelo/linha) — pequeno, abre caminho para métricas reais no dashboard
2. **R2** (prazo de entrega) — alto valor para a operação, pequeno esforço
3. **R9** (notificação por e-mail) — alto valor para a experiência do cliente, esforço médio
4. **R1** (Cliente como entidade) — grande mudança de modelo, deixar por último ou só fazer quando justificar pelo volume

> **R11** (anexo de layout final) já foi entregue na versão atual — ver seção acima.

Cada um cabe em uma branch separada e merge incremental — não precisa esperar tudo ficar pronto.
