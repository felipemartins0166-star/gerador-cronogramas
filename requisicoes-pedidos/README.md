# Painel de Requisições e Pedidos de Compra

Página única (HTML) publicada como artefato do Claude, com banco de dados compartilhado (`db`), importação de Excel (SheetJS) e exportação CSV.

- `index.html`: versão publicada (head + logic + ui concatenados).
- `src/head.html`: título, fontes e CSS (tema vermelho, claro/escuro).
- `src/logic.js`: regras de negócio (dias úteis, status, pedidos únicos, quantidades, pendente = solicitada − recebida − cancelada).
- `src/ui.js`: páginas, formulários, importação Excel, administração, contas e permissões.
- `src/auth.js`: SHA-256 e hash de senha (matrícula) das contas.
- `tests/test_logic.js`: testes das regras (lê `seed/`, não incluído neste repositório por conter dados reais de compras).

Montagem: `head.html` + marcação do menu + script SheetJS (cdnjs 0.18.5) + `logic.js` + `ui.js` dentro de `<script>`.

Contas: nome (usuário) + matrícula (senha, guardada só como hash). Níveis: Leitor, Editor e Administrador (dono da página); o administrador libera Editor em Administração › Usuários.
