# Requisitos Funcionais
## 🍽️ Ponto de Venda (POS)
### Gestão de Mesas

RF1 O sistema deve permitir visualizar um mapa de mesas com estado em tempo real (livre, ocupada, reservada)
RF2 O sistema deve permitir abrir e fechar mesas

### Registo de Pedidos

RF3 O sistema deve permitir adicionar, editar e remover itens de um pedido via interface tátil
RF4 O sistema deve suportar modificadores de itens (ex: "extra molho", "bem passado")
RF5 O sistema deve permitir enviar pedidos parciais para a cozinha sem fechar a mesa
RF6 O sistema deve suportar múltiplos pedidos por mesa ao longo do tempo
RF7 O sistema deve permitir cancelar ou editar um pedido no POS e no KDS
RF8 O sistema deve suportar pedidos Take-away

### Gestão de Pagamentos

RF9 O sistema deve suportar pagamento em várias opções
RF10 O sistema deve permitir divisão de conta por número de pessoas ou por itens selecionados
RF11 O sistema deve permitir aplicar descontos em percentagem ou valor fixo pelo valor total
RF12 O sistema deve poder gerar recibos 
RF13 O sistema deve calcular o troco automaticamente em pagamentos a dinheiro
RF14 O sistema deve registar gorjetas

### Gestão de Menu

RF15 O sistema deve permitir criar, editar, desativar e apagar categorias e produtos
RF16 O sistema deve suportar preços variáveis através de modificadores (ex: francesinha -> com ovo )
RF17 O sistema deve permitir associar imagens aos produtos
RF18 O sistema deve indicar produtos esgotados em tempo real

## 👨‍🍳 Kitchen Display System (KDS)

RF19 O sistema deve exibir os pedidos enviados pelo POS em tempo real via WebSockets
RF20 O sistema deve organizar os pedidos por mesa e por hora de envio
RF21 O sistema deve permitir marcar um pedido como "em preparação" e "pronto"
RF22 O sistema deve marcar um pedido completo como "pronto a servir" e notificar o POS
RF23 O sistema deve exibir o tempo decorrido desde que o pedido foi enviado, com alertas visuais para atrasos

## 📦 Gestão de Stocks e Fichas Técnicas

RF24 O sistema deve permitir criar fichas técnicas de receitas associando ingredientes e quantidades
RF25 O sistema deve realizar abate automático de stock quando um pedido é confirmado
RF26 O sistema deve alertar quando um ingrediente atingir o stock mínimo definido
RF27 O sistema deve permitir editar o stock manualmente

## 📊 Backoffice e Analytics

RF28 O sistema deve gerar relatórios de vendas por período selecionado
RF29 O sistema deve apresentar relatórios por produto, categoria, mesa e empregado
RF30 O sistema deve mostrar o tempo médio de preparação por prato
RF31 O sistema deve permitir exportar relatórios em CSV
RF32 O sistema deve permitir configurar remotamente preços e menus sem reiniciar o sistema
RF33 O sistema deve mostrar um dashboard com KPIs (faturação do dia, mesas abertas, etc.)

## 👥 Gestão de Utilizadores e Acessos

RF34 O sistema deve suportar diferentes perfis: Gestor, Empregado de Mesa, Cozinheiro
RF35 O sistema deve autenticar utilizadores com PIN numérico rápido no POS e KDS ou email/password no backoffice
RF36 O sistema deve restringir funcionalidades por perfil (ex: só gestores podem aceder ao backoffice)
RF37 O sistema deve registar logs de ações dos utilizadores (quem fez o quê e quando)
RF38 O sistema deve poder fazer a gestão de funcionários

## 🖨️ Integrações e Periféricos
RF39 O sistema deve funcionar em tablets e ecrãs touch screen


# Requisitos Não-Funcionais
## ⚡ Performance

RNF1 O sistema deve sincronizar pedidos entre POS e KDS em menos de 1 segundo via WebSockets
RNF2 O sistema deve suportar pelo menos 20 utilizadores simultâneos sem degradação de performance

## 🔒 Segurança

RNF3 Toda a comunicação deve ser feita sobre HTTPS e WebSockets seguros (WSS)
RNF4 As passwords devem ser armazenadas com hashing (bcrypt ou equivalente via Supabase Auth)
RNF5 O acesso ao backoffice deve suportar autenticação de dois fatores (2FA)

## 📱 Usabilidade

RNF6 A interface do POS deve ser operável com luvas e em ecrãs com gordura (elementos táteis grandes, mínimo 48x48px)
RNF7 O KDS deve ser legível a 2 metros de distância (tipografia e contraste adequados)
RNF8 O sistema deve responder a interações do utilizador em menos de 200ms

## 🌐 Disponibilidade e Resiliência

RNF9 O sistema deve funcionar em modo offline para operações críticas (registo de pedidos, pagamentos)
RNF10 O sistema deve ter uma disponibilidade mínima de 99.5% em horário de serviço

## 🔧 Manutenibilidade

RNF11 O código deve seguir uma estrutura modular com separação clara entre frontend e backend
RNF12 O sistema deve ter logs de erros centralizados

## 💰 Custo

RNF13 O sistema deve ser alojado exclusivamente em serviços gratuitos (Supabase free tier, Vercel free tier)
