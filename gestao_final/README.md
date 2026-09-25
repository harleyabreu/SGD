# Gestão de Demandas de TI — versão consolidada

Protótipo funcional em React + TypeScript + Vite, baseado na documentação consolidada do projeto e nas regras já definidas.

## Funcionalidades incluídas
- Login e perfis Gestor/Analista
- Dashboard gerencial completo com filtros, indicadores, distribuição, produtividade e demandas que exigem atenção
- Todas as Demandas com busca, filtros e visão Kanban
- Nova Demanda com prazo automático em dias úteis
- Detalhes da demanda com histórico, comentários, anexos, pendência, retomada, conclusão, cancelamento, atribuição, redistribuição e reabertura
- Cadastros de Usuários, Órgãos, Sistemas, Tipos de Demanda e Feriados
- Configurações de prazo/calendário/notificações
- Relatórios gerenciais
- Meu Perfil
- Central de Notificações
- Persistência local em localStorage para prototipação

## Regras preservadas
- Fluxo: Nova → Aguardando → Em Processo → Com Pendências → Em Processo → Concluída
- Atrasada é condição automática, não status
- Aguardando significa aguardando definição/atribuição do Analista
- Analista é opcional na criação
- Prazo: Crítica 2, Alta 6, Média 10, Baixa 20 dias úteis
- Dia de abertura não conta; fins de semana e feriados não contam
- Com Pendências pausa a execução
- Motivos obrigatórios para pendência, redistribuição, cancelamento e reabertura
- Conclusão exige comentário
- Gestor administra dados principais e todos os cadastros
- Analista acessa somente as próprias demandas
- Cliente não possui acesso ao sistema
- Não existe o status Em teste

## Instalação
1. Extraia o ZIP.
2. Abra a pasta no VS Code.
3. Execute `npm install`.
4. Execute `npm run dev`.
5. Acesse o endereço exibido pelo Vite.

Usuário inicial do protótipo: `lorenna`.
Senha pode ser qualquer valor não vazio no protótipo local.

## Observação
Esta versão usa localStorage para permitir validação rápida da interface e das regras. Para produção, a camada de autenticação, banco de dados, e-mail, armazenamento de arquivos e segurança deverá ser ligada a um backend.
