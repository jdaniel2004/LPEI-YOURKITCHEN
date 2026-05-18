# Estado da Arte: Sistemas de Gestão para Restauração (POS e KDS)

Este documento descreve o estado da arte referente ao desenvolvimento de sistemas integrados de **Point of Sales (POS)** e **Kitchen Display System (KDS)**, no contexto do Projeto (Protocolo 068), destacando o software que lidera o mercado atual, as tecnologias e arquiteturas que o suportam, as funcionalidades padrão esperadas e como estas soluções servem as operações dos restaurantes.

---

## 1. Soluções de Software no Mercado Atual

Atualmente, o mercado da restauração abandonou as caixas registadoras isoladas e os bilhetes de papel, adotando plataformas integradas e digitais. Alguns dos principais exemplos de software que aplicam este paradigma no dia-a-dia incluem:

- **Toast POS**: Uma das soluções líderes de mercado, focada em restaurantes. Baseado num ecossistema hardware proprietário (Android) com gestão Cloud, oferece uma integração nativa impecável entre a frente de loja, a cozinha e a gestão de clientes.
- **Square for Restaurants**: Reconhecido pela sua enorme facilidade de uso e design centrado no utilizador (focado em dispositivos iOS, como iPads). Permite uma excelente sincronização em tempo real entre o POS de sala e o ecrã na cozinha, adequando-se desde "Food Trucks" a restaurantes "Fine Dining".
- **Lightspeed Restaurant**: Um sistema robusto baseado na *cloud* que se destaca pela sua capacidade analítica e de gestão de inventário avançada, roteando pedidos entre múltiplas áreas de preparação de forma imediata.
- **TouchBistro**: Altamente focado em cenários de quebra de rede, este sistema utiliza um modelo de conetividade híbrida (LAN local combinada com Cloud) para garantir que as comunicações entre o POS e o KDS nunca falham a meio do serviço, uma característica crítica para a resiliência em tempo real.

---

## 2. Tecnologias e Arquiteturas Utilizadas

O sucesso destes sistemas depende intrinsecamente de pilhas tecnológicas modernas que assegurem estabilidade, velocidade (latência zero) e tolerância a falhas (resiliência).

- **Comunicação em Tempo Real (WebSockets / RPC)**:
  Para que o pedido de um cliente chegue num instante ao KDS da cozinha, as abordagens clássicas de *polling* HTTP foram substituídas por conexões persistentes bidirecionais. O uso de **WebSockets** (através de bibliotecas como *Socket.io*, *SignalR*), eventos SSE (Server-Sent Events) ou protocolos gRPC é hoje o standard da indústria. Estas tecnologias garantem que não existe *delay* de comunicação.
- **Interfaces Táteis e Frontend**:
  Dada a exigência de "velocidade" num restaurante, as interfaces do POS e KDS têm de ser altamente responsivas. Utilizam-se extensamente bibliotecas baseadas em componentes reativos, como **React / React Native, Vue.js, ou interfaces nativas (Swift/Kotlin)**. Muitas soluções adotam PWA (Progressive Web Apps) com recurso a *Service Workers* e bases de dados locais (*IndexedDB* ou *SQLite*) para garantir um modo "Offline First", essencial caso a internet do restaurante falhe.
- **Backend e Cloud**:
  A arquitetura predominante é baseada em microserviços (frequentemente desenvolvidos em Node.js, Go ou Java) implementados em provedores de Cloud (AWS, Azure, GCP).
- **Persistência de Dados e Cache**:
  Sistemas duplos são normais: bases de dados relacionais rigorosas (como PostgreSQL) para faturas e consistência de inventário, suportadas por bases de dados em memória (como o **Redis**) para gerir sessões, estados de mesas e filas de mensagens instantâneas entre o POS e o KDS.
- **Vibe Coding e Aceleração com IA**:
  O "Vibe Coding" proposto neste projeto espelha uma tendência de ponta no desenvolvimento de software atual: a utilização iterativa e dirigida de assistentes de Inteligência Artificial (como o GitHub Copilot, Cursor ou claude.ai) para criar código complexo de sincronização e concorrência de rede, permitindo aos developers focar-se na orquestração funcional e na experiência de utilizador (UX) em vez de no *boilerplate*.

---

## 3. Ferramentas e Funcionalidades Essenciais

Os sistemas mais bem-sucedidos transformam por completo o ecossistema de gestão de um estabelecimento hoteleiro, agrupando diversas ferramentas:

### Ponto de Venda (POS - Frente de Loja)
- **Registo Tátil Otimizado**: Interface para introdução ultrarrápida de pedidos baseada em categorias e modificadores de produtos.
- **Gestão de Planta**: Representação gráfica do mapa de mesas em tempo real (mesas livres, ocupadas, aguardando conta).
- **Operações Financeiras**: Divisão rápida de contas complexas, gestão de múltiplos pagamentos, descontos, e gorjetas num fluxo unificado.

### Kitchen Display System (KDS - Cozinha)
- **Sincronização Imediata e Roteamento**: Os pedidos aparecem em ecrãs na cozinha assim que são introduzidos, separados automaticamente por estação (ex: bebidas vão para o bar, quentes vão para o grelhador).
- **Gestão de Estado Visual**: Codificação dinâmica por cores dos pedidos consoante o tempo de espera (ex: verde no início, e vermelho se ultrapassar o tempo limite de confeção).
- **Painel de Controlo da Cozinha**: Possibilidade de dar o pedido como "Em Preparação", "Pronto" (notificando automaticamente a sala/staff) através do toque no ecrã ou barras físicas (*Bump Bars*).

### Gestão de Stocks, Fichas Técnicas e Backoffice
- **Fichas Técnicas (Receituário)**: Associação de múltiplos ingredientes a um produto para que, na venda, haja abate proporcional automático (*Food Cost*).
- **Configurações e Preçários**: Alteração remota e imediata da ementa (em tempo real) em todos os terminais sem necessidade de *reboots*.
- **Analytics e Relatórios**: Exportação de mapas de IVA, análise em tempo real dos produtos mais vendidos, horários de pico e rendimento individual por empregado.

---

## 4. Como Servem os Clientes e Impacto Operacional

Os atuais POS com KDS não são meras máquinas de registo, são o "sistema nervoso central" do restaurante, servindo tanto o **Staff/Gestores** como o **Consumidor Final**:

- **Para o Estabelecimento (Eficiência e Controlo)**:
  Elimina o clássico e lento tráfego de papéis e "gralhas" de caligrafia entre sala e cozinha. Permite que o colaborador de mesa passe 90% do seu tempo de qualidade na sala (podendo mesmo usar terminais móveis/PDAs no momento do pedido). A monitorização rigorosa do stock inibe furtos ou desperdícios e permite ao dono adaptar o menu instantaneamente consoante as métricas de vendas (*Analytics*).
- **Para o Consumidor (Experiência e Satisfação)**:
  Resulta numa experiência "sem atrito". Os pedidos chegam perfeitos e muito mais rápido à mesa. A possibilidade de pagamentos flexíveis (fatura segmentada por pessoas ou itens) resolve uma das maiores dores do cliente moderno no final das refeições de grupo, garantindo fluidez desde a entrada até à saída do estabelecimento.
