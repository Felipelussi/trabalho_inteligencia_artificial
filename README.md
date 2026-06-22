# Tutor Inteligente — Sistema Multiagente com LLMs Locais

> Trabalho Final · **Inteligência Artificial** · Profs. Diego A. Lusa e Roberto Rabello
> Tema escolhido: **Tutor inteligente para disciplinas específicas, com recuperação de materiais didáticos**
o 
Um tutor que responde dúvidas de estudantes **exclusivamente com base nos materiais didáticos da disciplina**, usando **dois agentes especializados** que cooperam, **modelos de linguagem executados localmente** (via Ollama) e um pipeline de **RAG** sobre uma base vetorial. Toda a interação acontece pelo **terminal**.

## Sumário

- [Descrição do problema](#descrição-do-problema)
- [Objetivo da solução](#objetivo-da-solução)
- [Arquitetura multiagente](#arquitetura-multiagente)
- [Tools disponíveis para os agentes](#tools-disponíveis-para-os-agentes)
- [Como o MCP (Model Context Protocol) foi utilizado](#como-o-mcp-model-context-protocol-foi-utilizado)
- [Estratégia de RAG (Retrieval-Augmented Generation)](#estratégia-de-rag-retrieval-augmented-generation)
- [Modelo local utilizado e forma de execução](#modelo-local-utilizado-e-forma-de-execução)
- [Dependências do projeto](#dependências-do-projeto)
- [Execução com Docker (recomendado)](#execução-com-docker-recomendado)
- [Instalação e execução (sem Docker)](#instalação-e-execução-sem-docker)
- [Exemplos de uso pelo terminal](#exemplos-de-uso-pelo-terminal)
- [Organização do repositório](#organização-do-repositório)
- [Mapeamento dos requisitos do trabalho](#mapeamento-dos-requisitos-do-trabalho)
- [Limitações conhecidas](#limitações-conhecidas)
- [Reflexão crítica](#reflexão-crítica)

## Descrição do problema

Estudantes frequentemente têm dúvidas pontuais sobre o conteúdo de uma disciplina (slides, apostilas, capítulos de livro), mas:

- procurar a resposta manualmente nos PDFs é lento;
- perguntar a um chatbot genérico (ChatGPT etc.) leva a respostas **não fundamentadas no material da disciplina**, podendo divergir do que o professor adotou e **alucinar** informações.

O problema escolhido é construir um **tutor que só responde com base nos materiais oficiais da disciplina**, citando a fonte de cada resposta e recusando-se a responder quando o conteúdo não está na base — reduzindo alucinação e mantendo aderência ao material adotado.

## Objetivo da solução

Oferecer, via terminal, um assistente de estudos que:

1. recebe a pergunta do aluno em linguagem natural, em **conversa de múltiplos turnos**;
2. **recupera** os trechos mais relevantes dos materiais (RAG sobre base vetorial);
3. **sintetiza** uma explicação didática **fundamentada apenas nesses trechos**, citando as fontes;
4. **recusa** responder (sem inventar) quando nada relevante é encontrado;
5. roda **100% local**, sem depender de APIs pagas (As vezes falha em fazer tool calls corretos com modelos tão básicos).

---

## Arquitetura multiagente

A solução usa o padrão **supervisor -> subagente** do framework Mastra. Um agente conversacional (Tutor) **coordena** e **delega** a tarefa de recuperação a um agente especialista (Recuperador). Todo o sistema de agentes é, por sua vez, **publicado via MCP** para clientes externos (veja [Como o MCP foi utilizado](#como-o-mcp-model-context-protocol-foi-utilizado)).

```
  Cliente MCP externo                        +----------------------------------+
  (Claude Desktop /        --ask_tutor-----> |  Servidor MCP (Tutor Inteligente)|
   Mastra Studio)          --ask_retriever-> |  publica os agentes como tools   |
                                             +----------------+-----------------+
                                                              |
  +-------------+   pergunta        +------------------------ v ------------------+
  |  Terminal   | ----------------> |  AGENTE TUTOR  (supervisor + memoria)      |
  | (pnpm chat) | <---------------- |  - mantem o historico da conversa          |
  +-------------+   resposta        |  - decide quando precisa do material       |
                    + fontes        |  - delega -------------+                   |
                                    +------------------------+-------------------+
                                                             v
                                    +--------------------------------------------+
                                    |  AGENTE RECUPERADOR  (subagente)           |
                                    |  - recebe a pergunta                       |
                                    |  - chama a tool searchMaterials (direto) --+
                                    |  - devolve trechos + fontes                |
                                    +------------------------------------+-------+
                                                                         v
                                    +--------------------------------------------+
                                    |  busca vetorial                            |
                                    |  embedQuery(pergunta) -> LibSQLVector.query|
                                    |  (Ollama: nomic-embed-text)                |
                                    +--------------------------------------------+
```

### Por que multiagente (e não um agente único)?

| Critério | Agente único | Arquitetura adotada (2 agentes) |
|---|---|---|
| Responsabilidades | Um prompt gigante misturando conversa, busca e síntese | Separação clara: **conversar/sintetizar** (Tutor) vs **recuperar** (Recuperador) |
| Contexto | O modelo precisa gerenciar tudo de uma vez | O Recuperador recebe só a tarefa de busca; o Tutor só vê os trechos prontos |
| Controle | Difícil garantir que a busca aconteça | O Tutor decide explicitamente **quando** delegar |
| Manutenção | Acoplado | Cada agente pode ter prompt/modelo/regras próprios |

A divisão é **funcional**, não decorativa: o fluxo "decidir -> recuperar -> fundamentar" mapeia diretamente nos dois papéis.

### Papel de cada agente

| Agente | Arquivo | Responsabilidade | Entradas | Saídas |
|---|---|---|---|---|
| **Tutor** (supervisor) | `src/mastra/agents/tutor-agent.ts` | Conversa com o aluno (memória multi-turno), decide quando consultar o material, **sintetiza** a resposta didática citando fontes e **recusa** quando não há base. | Pergunta do aluno + histórico da conversa | Resposta didática fundamentada |
| **Recuperador** (subagente) | `src/mastra/agents/retriever-agent.ts` | **Recuperação** pura: recebe uma consulta, aciona a tool de busca semântica e devolve os trechos com a fonte de cada um. Não explica e não inventa. | Consulta de busca | Trechos relevantes + `[Fonte: arquivo]` |

---

## Tools disponíveis para os agentes

| Tool | Arquivo | O que faz | Acionada por |
|---|---|---|---|
| `searchMaterials` | `src/mastra/tools/search-materials-tool.ts` | Recebe uma `query`, gera o embedding da consulta, faz busca por similaridade na base vetorial (`topK` + `minScore`) e retorna os trechos mais relevantes com `text`, `source` e `score`. | Agente Recuperador |

A tool tem `inputSchema`/`outputSchema` validados com **Zod**, garantindo entrada/saída tipadas e seguras.

## Como o MCP (Model Context Protocol) foi utilizado

O MCP é usado para **publicar o sistema de agentes como um recurso padronizado e consumível por protocolo** — exatamente o papel previsto no enunciado ("integração entre agentes e ferramentas"). Em vez de embutir a integração no app, os **agentes** são expostos como tools MCP, de modo que **qualquer cliente MCP** (Claude Desktop, Mastra Studio, outro app) possa conversar com o tutor sem conhecer seus detalhes internos.

- **Servidor MCP** (`src/mastra/mcp/server.ts`): cria um `MCPServer` que publica os **dois agentes** como tools. A chave de cada agente vira o nome da tool:
  - **`ask_tutor`** — conversa com o Tutor (supervisor; usa RAG internamente e responde com fontes);
  - **`ask_retriever`** — recuperação pura dos trechos crus dos materiais.
- **Exposição via HTTP / Studio:** o servidor é registrado na instância Mastra (`src/mastra/index.ts -> mcpServers: { tutorDocs }`), que o serve por HTTP e o exibe no **Mastra Studio** (`pnpm dev`).
- **Exposição via stdio (cliente externo):** para ligar o servidor a um cliente MCP local como o **Claude Desktop**, há o entrypoint stdio independente `scripts/mcp-server.ts` (`server.startStdio()`), executado com **`pnpm mcp`**.

Internamente, o Agente Recuperador chama a tool `searchMaterials` **diretamente** (sem roundtrip MCP) — o MCP atua na **fronteira externa** do sistema, tornando os agentes **desacoplados, padronizados e reutilizáveis** por qualquer cliente do protocolo.

> **Verificação rápida** do servidor MCP (lista as tools publicadas):
> ```bash
> printf '%s\n%s\n' \
>   '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0.0.0"}}}' \
>   '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | pnpm mcp
> # -> retorna as tools ask_tutor e ask_retriever
> ```

## Estratégia de RAG (Retrieval-Augmented Generation)

O RAG acontece em duas fases:

**1. Indexação (offline) — `pnpm ingest`** (`scripts/ingest.ts`)
```
materials/*.pdf
  -> extracao de texto      (unpdf)
  -> chunking recursivo     (MDocument, maxSize=512, overlap=50)
  -> embeddings em lote     (Ollama: nomic-embed-text -> vetores 768-dim)
  -> upsert na base vetorial (LibSQLVector, indice "materiais", metadados: texto + fonte)
```

**2. Recuperação (em tempo de consulta)** (`src/mastra/rag/vector-store.ts -> searchPassages`)
```
pergunta -> embedding da consulta -> LibSQLVector.query(topK=4, minScore=0.3)
        -> trechos mais similares + fonte -> entregues ao Tutor para fundamentar a resposta
```

O `minScore` evita devolver trechos irrelevantes; quando nenhum trecho passa do limiar, o Tutor responde que **não encontrou no material** (anti-alucinação). A resposta final é sempre **ancorada nos trechos recuperados**, não no conhecimento paramétrico do modelo.

### Origem e natureza da base de conhecimento

- **Natureza:** materiais didáticos em **PDF** (apostilas/documentos da disciplina).
- **Origem (demonstração):** capítulo **"Redes neurais convolucionais I"** do livro *Inteligência Artificial* (Sidney Cerqueira Bispo dos Santos) — `materials/redes_convuolucionais.pdf`, 17 páginas cobrindo processamento digital de imagens, formação e extração de características, e fundamentos de CNNs.
- A base é **trocável**: basta substituir os PDFs em `materials/` e rodar `pnpm ingest` novamente para usar o tutor em qualquer outra disciplina.

### Embeddings e armazenamento vetorial

| Item | Tecnologia | Detalhe |
|---|---|---|
| Modelo de embeddings | **`nomic-embed-text`** (Ollama, local) | Vetores de **768 dimensões** |
| Geração | AI SDK `embed` / `embedMany` | `embedMany` em lote na ingestão; `embed` por consulta |
| Armazenamento vetorial | **`LibSQLVector`** (`@mastra/libsql`) | Banco **libSQL** local em arquivo (`tutor.db`), métrica de **similaridade de cosseno** |
| Metadados | texto do chunk + nome do arquivo de origem | usados para citar a fonte |

> **Por que libSQL e não Chroma (ou outro banco vetorial dedicado)?** Além de fazer a busca vetorial, o **libSQL** se integra nativamente com o Mastra para **armazenar o histórico de mensagens das conversas** (memória multi-turno via `LibSQLStore`). Assim, um único banco em arquivo (`tutor.db`) cobre tanto o índice vetorial quanto a memória do Tutor — sem precisar subir e manter um serviço separado só para os vetores.

---

## Modelo local utilizado e forma de execução

- **LLM (raciocínio/síntese/decisão de delegação):** `llama3.2:3b` — modelo da família **LLaMA**, leve, escolhido por rodar bem em **máquinas modestas** (a capacidade de processamento foi o critério, conforme o roteiro permite).
- **Embeddings:** `nomic-embed-text` — leve (~270MB), 768 dimensões.
- **Execução:** ambos rodam via **[Ollama](https://ollama.com)** (`http://localhost:11434`), sem nenhuma chamada a serviços externos pagos.

> O modelo de LLM é configurável por variável de ambiente (`TUTOR_LLM_MODEL`), sem alterar o código. **Para modificar o modelo (ou qualquer outra configuração), basta copiar o `.env.example` para `.env` e personalizar os valores** (`cp .env.example .env`). O modelo que obteve maior sucesso foi o llama3.2:3b que está configurado como padrão. Também foi testado com qwen3.5:4b que não conseguia fazer as chamadas ao subagent e tools com precisão. Veja [Limitações](#limitações-conhecidas).

---

## Dependências do projeto

**Runtime:**

| Pacote | Papel |
|---|---|
| `@mastra/core` | Framework de agentes (Agent, Memory, padrão supervisor) |
| `@mastra/mcp` | Servidor **MCP** que publica os agentes (HTTP + stdio) |
| `@mastra/rag` | Processamento de documentos / **chunking** (`MDocument`) |
| `@mastra/libsql` | Armazenamento: `LibSQLStore` (memória) + `LibSQLVector` (vetorial) |
| `@mastra/memory` | Memória de conversa multi-turno |
| `@mastra/loggers` | Logs |
| `ollama-ai-provider-v2` | Provider para **LLM e embeddings locais** via Ollama |
| `ai` | AI SDK (`embed` / `embedMany`) |
| `unpdf` | Extração de texto de **PDF** |
| `zod` | Validação de schemas das tools |

**Desenvolvimento:** `mastra` (CLI/Studio), `tsx` (executar TypeScript), `vitest` (testes), `typescript`, `@types/node`.

**Ambiente:** Node.js **>= 22.13**, `pnpm`, **Ollama**.

---

## Execução com Docker (recomendado)

Esta é a forma mais simples: **não exige instalar Node, pnpm nem Ollama, e não precisa ajustar nenhuma variável de ambiente**. O Docker sobe tudo — inclusive o Ollama e o download dos modelos locais.

**Pré-requisito único:** Docker + Docker Compose instalados.

```bash
docker compose run --rm tutor
```

Esse único comando:

1. constrói a imagem da aplicação;
2. sobe o container do **Ollama** e baixa os modelos `llama3.2:3b` e `nomic-embed-text` (na primeira vez baixa ~2-3 GB — pode levar alguns minutos; depois fica em cache);
3. **indexa automaticamente** os PDFs de `materials/` (apenas na primeira execução);
4. abre o **chat interativo no seu terminal**.

### Como conversar com o agente

O `docker compose run` conecta o **terminal interativo** (stdin/TTY) ao container, então o chat funciona exatamente como rodando localmente:

```
Tutor Inteligente - faca sua pergunta sobre a disciplina (digite "sair" para encerrar).

Voce: O que e o protocolo TCP?
Tutor: ...
Voce: sair
```

Para uma **pergunta única** (sem entrar no loop), passe a pergunta como comando:

```bash
docker compose run --rm tutor pnpm chat "O que e o protocolo TCP?"
```

### Comandos úteis

```bash
# Reindexar manualmente (apos trocar PDFs em materials/)
docker compose run --rm tutor pnpm ingest

# Rodar os testes dentro do container
docker compose run --rm tutor pnpm test

# Parar o Ollama que ficou rodando em segundo plano
docker compose down

# Resetar tudo (apaga modelos baixados, indice e memoria) e recomecar do zero
docker compose down -v
```

### Inspeção visual no Mastra Studio

O serviço `server` builda o Mastra com o **Studio embutido** e o serve em `0.0.0.0:4111` (a porta do Mastra, mapeada para o host). Use o Studio para **visualizar a interação entre os agentes** — as chamadas do Tutor (supervisor) ao Recuperador (subagente), as tools acionadas (`searchMaterials`) e o servidor MCP (`ask_tutor` / `ask_retriever`).

```bash
# Sobe o servidor + Studio (e o Ollama, como dependencia)
docker compose up server
```

Depois, abra no navegador: **http://localhost:4111** (equivalente a `0.0.0.0:4111` exposto pelo container).

## Instalação e execução (sem Docker)

### 1. Pré-requisitos

```bash
# Node >= 22.13 e pnpm instalados
# Instale o Ollama: https://ollama.com  e garanta que esta rodando:
ollama serve            # (em outro terminal, se necessario)

# Baixe os modelos locais:
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### 2. Instalar dependências

```bash
pnpm install
cp .env.example .env     # opcional: ajuste modelos/parametros
```

### 3. Indexar os materiais (construir a base vetorial)

```bash
# Coloque os PDFs da disciplina em materials/ (ja ha exemplo de redes convolucionais)
pnpm ingest
```
Saída esperada (aprox.):
```
Indexado redes_convuolucionais.pdf: N chunks
Concluido. 1 arquivo(s) processado(s), N chunk(s) no indice "materiais".
```
> Para recomeçar do zero (apaga índice **e** memória de conversa): `rm -f tutor.db* && pnpm ingest`

### 4. Conversar com o tutor

```bash
pnpm chat                                                # modo conversa (multi-turno)
pnpm chat "O que sao redes neurais convolucionais?"      # pergunta unica (bom para demo)
```

### (Opcional) Inspeção visual — Mastra Studio
```bash
pnpm dev      # abre http://localhost:4111: mostra os dois agentes E o servidor MCP (tools ask_tutor / ask_retriever)
```

### (Opcional) Servidor MCP por stdio — para clientes externos
```bash
pnpm mcp      # publica os agentes via MCP/stdio (ex.: Claude Desktop). Veja "Como o MCP foi utilizado".
```

#### Usar no Claude Code

Para conectar o servidor ao **Claude Code**, registre-o uma única vez (na raiz do projeto). O `--scope project` grava em `.mcp.json` (versionável), e tudo após `--` é o comando que inicia o servidor stdio:

```bash
claude mcp add --scope project tutor -- pnpm mcp
```

Depois, verifique a conexão com `claude mcp list` (deve aparecer `✓ Connected`) ou abra o painel `/mcp` dentro do Claude Code. As tools `ask_tutor` e `ask_retriever` ficam disponíveis na sessão.

### Testes automatizados
```bash
pnpm test     # vitest (chunking + round-trip da base vetorial)
```

### Variáveis de ambiente (`.env`)

| Variável | Padrão                       | Descrição |
|---|------------------------------|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434/api` | Endpoint do Ollama |
| `TUTOR_LLM_MODEL` | `llama3.2:3b`                | Modelo de linguagem |
| `TUTOR_EMBED_MODEL` | `nomic-embed-text`           | Modelo de embeddings |
| `TUTOR_EMBED_DIM` | `768`                        | Dimensão dos vetores (deve casar com o modelo) |
| `TUTOR_DB_URL` | `file:./tutor.db`            | Arquivo libSQL (vetorial + memória) |
| `TUTOR_INDEX` | `materials`                  | Nome do índice vetorial |
| `TUTOR_TOPK` | `4`                          | Nº de trechos recuperados por consulta |
| `TUTOR_MIN_SCORE` | `0.3`                        | Similaridade mínima para retornar um trecho |

---

## Exemplos de uso pelo terminal

**Pergunta sobre conteúdo presente no material (resposta fundamentada + fonte):**
```
$ pnpm chat "O que sao redes neurais convolucionais e para que servem?"

Redes neurais convolucionais (CNNs) sao redes neurais modificadas para lidar
com imagens de grande porte (com muitos megabytes), reduzindo o custo
computacional e o risco de overfitting. Sao amplamente usadas em analise
e processamento de imagens... (Fonte: redes_convuolucionais.pdf)
```

**Pergunta fora do material (recusa anti-alucinação):**
```
$ pnpm chat "Qual a capital da Franca?"

Nao encontrei isso nos materiais indexados.
```

**Conversa multi-turno (o 2º turno usa o contexto do 1º):**
```
$ pnpm chat
Tutor Inteligente - faca sua pergunta sobre a disciplina (digite "sair" para encerrar).

Voce: O que e processamento digital de imagens?
Tutor: O processamento digital de imagens trata de tecnicas para aquisicao,
       representacao e manipulacao de imagens por computador. Uma imagem digital
       e uma matriz N x M cujos elementos (pixels) representam a intensidade
       de cinza... (Fonte: redes_convuolucionais.pdf)

Voce: Quais sao os tres niveis de processamento?
Tutor: Os tres niveis sao: (1) operacoes basicas como reducao de ruido e ajuste
       de contraste; (2) segmentacao e extracao de caracteristicas; (3) analise
       e classificacao de alto nivel... (Fonte: redes_convuolucionais.pdf)

Voce: sair
```

---

## Organização do repositório

```
src/mastra/
  config.ts                     # configuracoes via env (modelos, dims, paths, topK, minScore)
  ollama.ts                     # provider Ollama local (LLM + embeddings)
  index.ts                      # registro dos agentes + storage (entrada do Mastra)
  rag/
    embeddings.ts               # embedTexts() / embedQuery()
    vector-store.ts             # LibSQLVector + ensureIndex / upsertChunks / searchPassages
    documents.ts                # extracao de PDF (unpdf) + chunking (MDocument)
  models.ts                     # selecao do LLM de chat (Ollama local / OpenAI opcional)
  tools/
    search-materials-tool.ts    # tool de busca semantica
  mcp/
    server.ts                   # servidor MCP que publica os agentes (ask_tutor / ask_retriever)
  agents/
    retriever-agent.ts          # Agente Recuperador (subagente + tool searchMaterials)
    tutor-agent.ts              # Agente Tutor (supervisor + memoria)
scripts/
  ingest.ts                     # CLI de ingestao (PDFs -> base vetorial)
  chat.ts                       # CLI de conversa multi-turno
  mcp-server.ts                 # entrypoint stdio do servidor MCP (pnpm mcp)
tests/                          # testes (vitest)
materials/                      # PDFs da disciplina (base de conhecimento)
docs/ARQUITETURA.md             # documentacao tecnica complementar
```

## Mapeamento dos requisitos do trabalho

| # | Requisito | Onde é atendido |
|---|---|---|
| 1 | Arquitetura multiagente | `tutor-agent.ts` (supervisor/síntese) + `retriever-agent.ts` (recuperação) |
| 2 | Uso de LLMs | Tutor decide a delegação e compõe a resposta; Recuperador formula/aciona a busca |
| 3 | Modelos locais (LLaMA/similar) | `llama3.2:3b` + `nomic-embed-text` via **Ollama** (`ollama.ts`, `config.ts`) |
| 4 | MCP | `mcp/server.ts` publica os agentes como tools MCP (`ask_tutor` / `ask_retriever`), servidas por HTTP no Studio e por stdio via `pnpm mcp` (`scripts/mcp-server.ts`) |
| 5 | RAG | `rag/vector-store.ts` (`searchPassages`) + `scripts/ingest.ts` |
| 6 | Embeddings + armazenamento vetorial | `rag/embeddings.ts` + `LibSQLVector` (768 dims, cosseno) |
| 7 | Tools para os agentes | `tools/search-materials-tool.ts` |
| 8 | Interface via terminal | `scripts/ingest.ts`, `scripts/chat.ts` |
| 9 | Documentação técnica | este README + `docs/ARQUITETURA.md` |

---

## Limitações conhecidas

- **Qualidade do modelo leve:** o `llama3.2:3b` prioriza rodar em hardware modesto, mas pode **alucinar detalhes** ou citar a fonte de forma imprecisa. O mecanismo de RAG recupera o material correto; a fidelidade da redação depende do modelo.
- **Dependência de *tool-calling*:** o padrão supervisor exige que o modelo emita chamadas de ferramenta/delegação de forma confiável — outro ponto que melhora com modelos maiores.
- **Dimensão fixa de embeddings:** o índice é criado com 768 dims; trocar o modelo de embeddings exige reindexar (`rm -f tutor.db* && pnpm ingest`).

## Reflexão crítica

O projeto mostra, de forma enxuta e funcional, a integração dos principais conceitos da disciplina: **coordenação entre agentes** (supervisor + subagente), **execução local de modelos** (LLaMA via Ollama), **uso de contexto recuperado** (RAG com base vetorial) e **exposição do sistema por protocolo padronizado** (MCP, publicando os agentes como tools consumíveis por qualquer cliente). A maior parte das limitações observadas vem da **capacidade do modelo local leve**, e não da arquitetura — que permanece válida e diretamente escalável a modelos melhores apenas trocando uma variável de ambiente. O principal ganho da abordagem multiagente aqui é a **separação de responsabilidades** e o **controle explícito** sobre quando recuperar contexto, o que torna o sistema mais auditável e menos propenso a alucinação do que um agente único.
