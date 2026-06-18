# Tutor Inteligente

Tutor para uma disciplina universitária que responde perguntas do aluno com base nos
materiais didáticos (PDFs), usando dois agentes locais que colaboram.

## Arquitetura (resumo)

- **Agente Tutor (supervisor)** — conversa com o aluno (memória multi-turno) e delega
  a recuperação ao Recuperador; sintetiza a resposta didática citando as fontes.
- **Agente Recuperador (subagente)** — usa a tool `searchMaterials` exposta via **MCP**
  para buscar trechos relevantes na base vetorial.
- **RAG** — PDFs são divididos em chunks, transformados em **embeddings locais**
  (`nomic-embed-text` via Ollama) e guardados em um índice **LibSQLVector** local.
- **Tudo local** — LLM (`llama3.2:3b`) e embeddings rodam no **Ollama**.

Detalhes em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Pré-requisitos

1. Node.js >= 22.13 e `pnpm`.
2. [Ollama](https://ollama.com) instalado e rodando (`ollama serve`).
3. Modelos baixados:
   ```bash
   ollama pull llama3.2:3b
   ollama pull nomic-embed-text
   ```

## Setup

```bash
pnpm install
cp .env.example .env   # ajuste se quiser
```

## Uso

1. Coloque os PDFs da disciplina em `materials/`.
2. Construa a base vetorial:
   ```bash
   pnpm ingest
   ```
3. Converse com o tutor:
   ```bash
   pnpm chat
   ```
   Ou pergunta única: `pnpm chat "o que é uma transação ACID?"`

## Modelo

O modelo é configurável por env (`TUTOR_LLM_MODEL`). Se o tutor não delegar/usar a tool
de forma confiável com `llama3.2:3b`, troque por um modelo melhor em tool-calling:
`qwen2.5:3b` (leve) ou `llama3.1:8b`.

## Testes

```bash
pnpm test
```
