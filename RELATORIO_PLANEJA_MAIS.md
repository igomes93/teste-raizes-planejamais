# Relatório Técnico — Planeja+
### Portal de Monitoramento Participativo | Associação Raízes

---

## Apresentação

Este documento descreve o desenvolvimento do **Planeja+**, um portal web de monitoramento de dados construído para a Associação Raízes. O sistema foi criado do zero com o objetivo de transformar planilhas Excel em um painel interativo de análise — permitindo que qualquer pessoa, sem conhecimento técnico, consiga enxergar o desempenho do programa de forma clara, atualizada e confiável.

O trabalho envolveu duas frentes principais: o desenvolvimento da aplicação em si, e uma auditoria completa dos dados para garantir que todos os números exibidos no painel estivessem corretos.

---

## O que foi construído

### Visão geral da aplicação

O Planeja+ é uma aplicação web que roda localmente no computador (ou pode ser publicada em qualquer servidor). Ao abrir o endereço no navegador, o usuário tem acesso a um painel completo com indicadores, gráficos, filtros e uma tabela com todos os registros. Não é preciso abrir planilha nenhuma, nem saber usar Excel.

A aplicação foi dividida em duas "abas" de conteúdo, que refletem as duas atividades do trabalho proposto:

**Atividade 1 — Atividades & Metas:** painel principal com os indicadores de execução do programa, gráficos de tendência, distribuição por município, cumprimento de metas e tabela detalhada de todas as ações registradas.

**Atividade 2 — Royalties & Fiscal:** análise comparativa dos royalties do petróleo entre três municípios fluminenses — Maricá, Niterói e Armação dos Búzios — com base nos dados consolidados de 2024, trazendo uma perspectiva sobre dependência fiscal e vulnerabilidade orçamentária.

---

## Stack tecnológica

Antes de entrar nos detalhes do que foi feito, vale explicar com que ferramentas o sistema foi construído, porque isso tem impacto direto na escolha de cada decisão técnica.

**Python** é a linguagem principal do projeto. É amplamente usada para análise de dados e desenvolvimento web por ser simples de ler e extremamente poderosa. Toda a lógica de processamento das planilhas foi escrita em Python.

**FastAPI** é o framework responsável por servir os dados para o front-end. Em termos práticos, ele cria uma API — um conjunto de endereços (chamados endpoints) que o navegador consulta para buscar informações como métricas, gráficos e registros da tabela. FastAPI é moderno, rápido e produz automaticamente uma documentação das rotas disponíveis.

**Pandas** é a biblioteca usada para ler e processar os dados das planilhas Excel. Ela carrega os dados em memória como se fossem tabelas, permitindo filtrar, agrupar, somar e calcular qualquer coisa com poucas linhas de código.

**HTML, CSS e JavaScript puro** formam o front-end — tudo o que o usuário vê e interage no navegador. Não foi usado nenhum framework de front-end como React ou Vue; a escolha por JavaScript puro foi intencional para manter a aplicação leve e sem dependências desnecessárias.

**Chart.js** é a biblioteca de gráficos. Ela recebe os dados processados pelo back-end e os transforma em visualizações interativas — ao passar o mouse sobre qualquer ponto do gráfico, aparecem os valores exatos.

**Uvicorn** é o servidor que mantém a aplicação rodando. É ele quem "escuta" as requisições do navegador e as encaminha para o Python processar.

---

## A fonte de dados

Os dados vêm de dois arquivos Excel fornecidos junto com o projeto:

- **Planilha de atividades (Anexo 2):** contém o registro de todas as ações realizadas pelo programa. A planilha tem uma linha de título, uma linha de cabeçalho, e os dados começam de fato na terceira linha — detalhe que precisou ser configurado corretamente no código para evitar que a linha de título fosse lida como dado.

- **Quadro de metas (Anexo 1):** contém as 21 metas do programa com os valores previstos para cada tipo de atividade.

Após o carregamento e limpeza, chegou-se a **1.755 registros válidos** (o arquivo original tem 1.758 linhas de dados, das quais 3 eram duplicatas exatas que foram removidas automaticamente).

---

## Auditoria dos dados — o que foi encontrado e corrigido

Antes de qualquer análise, foi feita uma auditoria completa dos dados. Esse processo é fundamental em qualquer projeto de dados: de nada adianta ter um painel bonito se os números estão errados. Abaixo estão os problemas identificados e como cada um foi resolvido.

### 1. Problema de codificação de caracteres nas metas

Esse foi o bug mais sutil e de maior impacto no dashboard. O arquivo Excel de metas foi gravado com uma codificação de caracteres diferente da esperada, o que corrompeu alguns nomes de categorias ao serem lidos pelo Python. Dois casos críticos foram encontrados:

- A meta **"Produzir dossiê das ações de incidência política"** chegava ao sistema com o nome **"Produzir dossiêê..."** — o acento `ê` duplicado. Resultado: o sistema não conseguia cruzar essa meta com as atividades realizadas e exibia **0 realizações** para ela, quando na verdade havia **13**.

- A meta **"Realizar ações conjuntas com instituições e demais PEAs..."** chegava com **"monitorçamento"** no lugar de "monitoramento" — um `ç` espúrio inserido pelo problema de encoding. Resultado: o sistema também exibia **0 realizações**, quando na verdade havia **46**.

Esses dois erros juntos faziam com que **59 atividades reais simplesmente desaparecessem** do painel de cumprimento de metas. A correção foi feita diretamente no código de limpeza dos dados, com tratamento específico para cada artefato de codificação encontrado.

### 2. Município "Regional" estava excluído

O código original excluía explicitamente o município "Regional" de todas as contagens e do filtro de municípios. Como há **26 atividades** registradas com esse identificador, elas simplesmente não apareciam em lugar nenhum no dashboard. A exclusão foi removida e "Regional" passou a ser tratado como qualquer outro município.

### 3. Erro de divisão por zero no servidor

Quando o usuário selecionava uma combinação de filtros que retornava zero resultados, o servidor travava com um erro de divisão por zero — porque o código tentava calcular percentuais usando o total de atividades como divisor, sem checar se esse total era zero. Isso derrubava a aplicação inteira. O tratamento foi adicionado: quando os filtros não retornam resultados, o sistema exibe zeros de forma limpa, sem travar.

### 4. Sincronização do servidor após mudanças

Durante o desenvolvimento, o servidor foi iniciado com a opção de recarregamento automático (`reload=True`). Em alguns casos, ele manteve versões antigas do código em memória mesmo após edições nos arquivos. A solução foi encerrar os processos manualmente e reiniciar o servidor do zero para garantir que as correções fossem carregadas.

---

## As métricas do dashboard

A seguir, a descrição completa de cada indicador exibido no painel, com o valor correto após a auditoria.

### KPI-01 — Total de Atividades: **1.755**
Contagem direta de todos os registros válidos carregados da planilha. É o número base que alimenta todos os outros cálculos.

### KPI-02 — Média Mensal: **109,7 atividades/mês**
Calculada dividindo o total de atividades pelo número de meses distintos com pelo menos uma atividade registrada. O período coberto vai de **fevereiro de 2024 a maio de 2025**, totalizando **16 meses**. O mês mais intenso foi junho de 2024, com 149 atividades.

### KPI-03 — Total de Participantes Mobilizados: **10.108**
Soma direta da coluna de participantes. Vale notar que 140 atividades têm registro de 0 participantes — isso pode indicar atividades de representação (como participação em reuniões de conselho) onde não se aplica contagem de público.

### KPI-04 — Média de Participantes por Atividade: **5,76**
Média simples da coluna de participantes sobre o total de registros. Inclui os zeros, porque excluí-los artificialmente distorceria a média real do programa.

### KPI-05 — Municípios Ativos: **18**
Número de municípios distintos presentes nos dados. São eles: Araruama, Armação dos Búzios, Arraial do Cabo, Cabo Frio, Campos dos Goytacazes, Carapebus, Casimiro de Abreu, Itapemirim, Macaé, Marataízes, Piúma, Presidente Kennedy, Quissamã, Regional, Rio das Ostras, Saquarema, São Francisco de Itabapoana e São João da Barra. Os três mais ativos são Saquarema, Araruama e Arraial do Cabo (151, 151 e 137 atividades, respectivamente).

### KPI-06 — Taxa de Atividades Não Previstas: **51,5%**
Das 1.755 atividades, **904 foram classificadas como "Não Previstas"** e **851 como "Planejadas"**. Essa métrica mede o quanto do trabalho realizado extrapolou o planejamento original — o que pode indicar tanto responsividade do programa às demandas do território quanto necessidade de revisão no processo de planejamento.

### KPI-07 — Taxa de Pontualidade: **83,0%**
Das 851 atividades planejadas (que tinham data prevista), **706 foram realizadas dentro do prazo** e 145 com atraso. O critério usado é simples: se a data de realização é menor ou igual à data prevista, a atividade é considerada no prazo.

### KPI-08 — Cumprimento Global das Metas: **58,6%**
Razão entre o total de atividades realizadas (1.755) e a soma de todas as metas previstas no Quadro de Metas (2.994). Das 21 metas do programa, **2 foram 100% cumpridas ou superadas**:

- *Criar e disponibilizar arquivo de memória com ações e saberes dos GGLs*: meta de 13, **16 realizadas** (123,1%)
- *Produzir dossiê das ações de incidência política*: meta de 13, **13 realizadas** (100,0%)

As metas com menor progresso até o momento são *Realizar eventos locais e regionais para deliberações* (0%, sem registros), *Realizar intercâmbios para troca de experiências* (30,2%) e *Divulgar o orçamento público* (38,5%).

---

## Funcionalidades do painel

### Painel de filtros cruzados

O painel de filtros permite ao usuário combinar múltiplos critérios simultaneamente: município, status de planejamento, categoria da atividade, período por data e busca por texto. Todos os KPIs, gráficos e a tabela se atualizam automaticamente a cada mudança de filtro — sem precisar recarregar a página.

O filtro de município foi desenvolvido como um componente de seleção múltipla: é possível escolher um município isolado, ou combinar dois ou mais para análises comparativas. A opção "Todos os Municípios" continua disponível e é o estado padrão ao abrir o sistema.

### Gráficos interativos

Quatro visualizações foram implementadas:

**Evolução temporal das ações** — gráfico de linha mostrando a quantidade de atividades por mês, útil para identificar sazonalidades e picos de operação.

**Status do planejamento** — gráfico de rosca dividindo as atividades entre planejadas e não previstas, com legenda detalhada de percentual e contagem.

**Distribuição por município** — gráfico de barras verticais com todos os 18 municípios ordenados por volume de atividades, com gradiente visual de azul a verde.

**Execução de metas por categoria** — lista com barras de progresso para cada uma das 21 metas, exibindo o valor realizado, a meta prevista e o percentual de cumprimento.

### Tabela de detalhamento

Todos os 1.755 registros estão disponíveis em uma tabela paginada (10 por página) com busca por texto livre. A busca funciona nos campos de descrição da atividade, local e resultados alcançados. É possível navegar entre as 176 páginas de resultados.

### Aba Royalties & Fiscal (Atividade 2)

Esta seção apresenta uma análise comparativa da dependência fiscal de três municípios do estado do Rio de Janeiro em relação às receitas de royalties e participações especiais do petróleo, com dados consolidados de 2024:

- **Maricá**: receita total de R$ 6,87 bi, com R$ 2,69 bi em royalties (39,2% de dependência)
- **Niterói**: receita total de R$ 6,03 bi, com R$ 2,23 bi em royalties (37,0% de dependência)
- **Armação dos Búzios**: receita total de R$ 635 mi, com R$ 168 mi em royalties (26,5% de dependência)

Os dados foram obtidos nos Portais da Transparência dos respectivos municípios e na base da ANP (Agência Nacional do Petróleo).

### Tema claro/escuro e responsividade

O sistema possui alternância entre tema claro (padrão) e escuro, com todos os gráficos reconstruídos automaticamente na troca para manter a legibilidade das cores. O layout é responsivo e se adapta a telas menores — em tablets e celulares, as grades de KPIs e filtros reorganizam as colunas automaticamente.

---

## Resumo do que foi entregue

Para fechar, uma visão consolidada do que compõe a entrega:

- Aplicação web funcional com back-end em Python/FastAPI e front-end em HTML/CSS/JavaScript
- Processamento e limpeza automática dos dados a partir de dois arquivos Excel
- 8 indicadores de desempenho (KPIs) calculados dinamicamente com base nos filtros ativos
- 4 gráficos interativos com atualização em tempo real
- Filtro de município com seleção múltipla para análises comparativas
- Tabela completa com paginação e busca por texto
- Análise comparativa de royalties para 3 municípios fluminenses (Atividade 2)
- Auditoria completa dos dados com correção de 4 bugs críticos
- 59 atividades que estavam "invisíveis" nas metas foram recuperadas e contabilizadas corretamente
- Interface com tema claro/escuro e design responsivo

---

*Relatório elaborado por Igor Gomes Silva — Maio de 2025*
