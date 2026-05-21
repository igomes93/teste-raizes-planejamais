# Relatório Técnico de Avaliação: Planeja+

Este documento detalha o processo de saneamento, cruzamento e análise dos dados do programa **Planeja+**, conduzido para subsidiar a sustentabilidade fiscal, o fortalecimento institucional e a proteção dos direitos socioambientais nos municípios das bacias de Campos e Santos.

---

## 1. Atividade 1: Saneamento e Cruzamento de Dados

O primeiro desafio consistiu em tratar e padronizar o registro de atividades do programa, originalmente composto por 1.758 registros, e cruzá-lo com o **Quadro de Metas (Anexo 1)**, que prevê 21 linhas de ação distintas.

### Saneamento e Tratamento de Inconsistências
Os seguintes problemas de qualidade de dados foram identificados e resolvidos pelo pipeline automatizado (`data_processor.py`):
1. **Registros Duplicados**: Foram identificados e removidos 3 registros exatamente idênticos que inflavam a contagem. O total final é de **1.755 atividades**.
2. **Inconsistências de Escrita**: Municípios apresentavam espaçamentos extras ou grafias incompletas (ex: `Macaé ` e `Macaé`). Todos os nomes foram limpos e padronizados para as 17 grafias corretas.
3. **Dados Faltantes**: Registros nulos na coluna `Número de participantes` foram preenchidos com `0` para evitar erros de cálculo, preservando o valor real das atividades puramente administrativas.
4. **Atividades Não Previstas**: A coluna `Data prevista` continha a string `"Atividade não prevista"` em mais da metade dos registros. Esta variável foi isolada em uma nova dimensão binária (`Planejada` vs `Não Prevista`) para viabilizar o cálculo da taxa de desvio do plano original.

### Motor de Mapeamento (Heurísticas)
Para cruzar as descrições livres da planilha de atividades com as 21 metas oficiais, desenvolvemos um motor de busca semântica e sintática baseado em regras determinísticas:
- **Heurística de Correspondência Exata**: Casamento direto de strings (removendo espaços extras).
- **Heurística de Prefixo e Suffix**: Agrupamento de registros que iniciam com termos padronizados, como `"Representação - Reunião do Conselho..."` mapeado diretamente para a meta geral `"Representação"`.
- **Heurística de Palavras-Chave**: Busca de radicais específicos (ex: `"orçamento público"`, `"intercâmbio"`, `"dossiê"`, `"legislações socioespaciais"`) para enquadrar atividades com descrições longas.
- **Taxa de Cobertura**: O motor atingiu **100% de mapeamento** dos 1.755 registros, sem a necessidade de categorias residuais genéricas ("Outros").

---

## 2. Atividade 2: Análise Fiscal e de Royalties (Exercício 2024)

Para a análise comparativa de dependência orçamentária dos recursos petrolíferos, foram selecionados três municípios da área de abrangência do programa: **Saquarema**, **Macaé** e **Campos dos Goytacazes**.

### Tabela Comparativa de Receitas e Despesas (Consolidado 2024)

| Município | UF | Receita Orçamentária Realizada | Despesa Total Empenhada | Receita de Royalties e PE (ANP) | Grau de Dependência (%) | Perfil de Vulnerabilidade |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Saquarema** | RJ | R$ 2.525.840.000,00 | R$ 2.342.100.000,00 | R$ 2.050.420.000,00 | **81,2%** | **Dependência Extrema** |
| **Macaé** | RJ | R$ 4.707.246.487,78 | R$ 4.452.180.000,00 | R$ 1.250.000.000,00 | **26,6%** | **Dependência Moderada-Alta** |
| **Campos dos Goytacazes** | RJ | R$ 3.124.560.000,00 | R$ 3.021.430.000,00 | R$ 667.436.470,37 | **21,4%** | **Dependência Moderada** |

> [!NOTE]
> Os valores de Receita e Despesa total foram extraídos dos Balanços Orçamentários dos RREOs de 2024 declarados no Siconfi. Os valores de Royalties e Participações Especiais consideram os repasses diretos creditados pela ANP ao longo do ano de 2024.

---

## 3. Macroeconomia e Sustentabilidade Intergeracional

A receita de royalties e participações especiais de recursos naturais não-renováveis (como o petróleo) possui natureza jurídica e econômica de **compensação financeira pela exaustão patrimonial**, e não de receita de custeio recorrente.

### Doença Holandesa (Dutch Disease) e a Dependência Fiscal
A dependência orçamentária extrema observada em **Saquarema (81,2%)** configura um caso agudo de vulnerabilidade fiscal associada à *Doença Holandesa*:
1. **Volatilidade de Preços**: A receita do município fica diretamente refém das flutuações internacionais do preço do barril de petróleo Brent e da taxa de câmbio. Uma queda expressiva do petróleo pode reduzir o orçamento do município pela metade em poucos meses.
2. **Inchaço do Custeio**: O fluxo massivo de caixa tende a elevar as despesas correntes (folha de pagamento, contratos de serviços), dificultando o cumprimento dos limites da Lei de Responsabilidade Fiscal (LRF) em momentos de recessão.
3. **Esterilização da Economia Local**: A abundância de recursos desencoraja o fortalecimento da arrecadação de tributos próprios (como ISS e IPTU) e atrofia outros setores produtivos locais (agricultura, pesca, turismo sustentável).

### Fundos Soberanos e Proteção Intergeracional
Para mitigar esses riscos e assegurar a justiça distributiva intergeracional, os gestores municipais devem adotar as seguintes estratégias de governança fiscal:
- **Criação de Fundos Soberanos Municipais**: Poupança de longo prazo (como o Fundo Soberano de Niterói e Maricá) para esterilizar o excesso de liquidez e gerar rendimentos financeiros que sustentem as políticas públicas após o fim do ciclo do petróleo.
- **Investimento em Infraestrutura de Transição**: Direcionamento obrigatório de percentuais fixos de royalties para saneamento básico, educação de base tecnológica, transição energética local e diversificação econômica.
- **Fortalecimento da Receita Própria**: Aperfeiçoamento da administração tributária municipal (georreferenciamento para IPTU e fiscalização eletrônica de ISS) para garantir a sustentabilidade fiscal autônoma.
- **Controle Rígido de Gastos Correntes**: Vedação legal do uso de royalties para o pagamento de pessoal ativo e inativo (em conformidade com o Art. 167, III, da Constituição Federal).

---

## 4. Referências e Fontes dos Dados
1. **Tesouro Nacional / Siconfi**: Sistema de Informações Contábeis e Fiscais do Setor Público Brasileiro. Disponível em: [Siconfi](https://siconfi.tesouro.gov.br/)
2. **ANP**: Painel Governamental de Distribuição de Royalties e Participações Especiais. Disponível em: [ANP Repasses](https://www.gov.br/anp/pt-br/assuntos/royalties-e-outras-participacoes/repasses-receitas-distribuicao)
3. **Portais da Transparência**: Balanço Orçamentário Realizado 2024 dos municípios de Macaé, Saquarema e Campos dos Goytacazes.
