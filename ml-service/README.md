---
title: LLM Fact Checker Backend
emoji: 🔍
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# LLM Fact Checker Backend

This is the backend service for the LLM Fact Checker application. It provides:
- Fact checking logic using LLMs (Gemini/OpenAI)
- RAG (Retrieval Augmented Generation) pipeline
- Vector embeddings using Sentence Transformers
- Entity extraction using spaCy

## API Endpoints

- `POST /verify`: Verify a claim (Legacy)
- `POST /rag/verify`: Verify a claim using RAG pipeline
- `POST /feedback`: Submit user feedback
- `GET /health`: Health check
