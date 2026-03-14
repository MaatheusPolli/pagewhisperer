# 🗺️ PageWhisperer — Roadmap Estratégico

Este documento descreve a visão de evolução do **PageWhisperer**, organizado em três horizontes de crescimento, priorizando valor ao usuário e sustentabilidade técnica.

---

## 🌅 Horizonte 1 — Quick Wins (Concluído ✅ 09/03/2026)
*Foco: Polimento, Confiabilidade e Experiência do Usuário (UX).*

| Melhoria | Impacto Esperado | Esforço | Status |
| :--- | :--- | :---: | :--- |
| **Melhoria na Extração (Readability)** | Resumos mais precisos ao ignorar menus e anúncios de forma inteligente. | **M** | ✅ 09/03/2026 |
| **Botão "Copiar para Área de Transferência"** | Facilita o uso do resumo em outras ferramentas (Notion, Docs). | **P** | ✅ 09/03/2026 |
| **Feedback de Download do Modelo** | Mostrar progresso real do download do Gemini Nano na UI. | **P** | ✅ 09/03/2026 |
| **Exportar como Markdown** | Download direto do resumo formatado. | **P** | ✅ 09/03/2026 |
| **Refatoração do `aiService` (Abort)** | Implementar `AbortController` e Retry (2x) com fallback. | **P** | ✅ 09/03/2026 |
| **Atalhos de Teclado (Hotkeys)** | Abrir o painel instantaneamente via Ctrl+Shift+P. | **P** | ✅ 09/03/2026 |

---

## 🚀 Horizonte 2 — Evolução (1 a 3 meses)
*Foco: Funcionalidades que ampliam o uso e reduzem o débito técnico.*

| Melhoria | Impacto Esperado | Esforço | Status |
| :--- | :--- | :---: | :--- |
| **Histórico Local de Resumos** | Salvar resumos anteriores via `chrome.storage.local`. | **M** | ✅ 09/03/2026 |
| **Suporte Multilíngue Expandido** | Detectar idioma automaticamente antes da tradução. | **M** | ✅ 09/03/2026 |
| **Q&A Multi-turno (Chat)** | Permitir conversas contínuas sobre o conteúdo. | **G** | Pendente |
| **Customização de Prompts (Settings)** | Definir prompts de sistema ou "modos" de resumo. | **M** | Pendente |

---

... (rest of horizons)

---

## 📝 Log de Sessão — 09/03/2026
**Engenheiro: Gemini CLI**

- **Refatoração Técnica**: `aiService.js` agora possui lógica de retry (2 tentativas), gerenciamento centralizado de sessões e suporte a monitoramento de download.
- **UI/UX**: Adicionados botões de cópia e exportação. Implementado feedback de progresso de download e status do modelo.
- **Funcionalidades**: Implementado histórico local (últimos 5 itens) e atalhos de teclado.
- **Extração**: Criada lógica customizada "Readability-like" no `content-script.js` para limpeza de ruídos sem dependências externas.
- **Internacionalização**: Adicionada detecção automática de idioma de origem na `TranslationService`.
- **Adiado**: Q&A Multi-turno e Customização de Prompts (Esforço G/M para próxima fase).

---

## 🔭 Horizonte 3 — Visão (3 a 12 meses)
*Foco: Escalabilidade, Ecossistema e Inteligência Avançada.*

| Melhoria | Impacto Esperado | Esforço | Riscos / Dependências |
| :--- | :--- | :---: | :--- |
| **Integração com Segundo Cérebro** | Envio direto de resumos para Notion, Obsidian ou Tana via API. | **G** | Manutenção de OAuth/Tokens de terceiros. |
| **Resumo de Múltiplas Abas** | Criar um "meta-resumo" comparando ou agregando informações de várias abas abertas. | **G** | Complexidade na orquestração de contextos. |
| **Fallback para Modelos em Nuvem** | Opção de usar GPT-4o ou Claude 3.5 para páginas que excedem o limite do modelo local ou exigem mais precisão. | **M** | Custo de API e perda de privacidade total (offline). |
| **Modo Leitor Nativo (Reader Mode)** | Uma interface limpa dentro da própria página que integra o resumo e o Q&A de forma fluida. | **G** | Injeção de CSS complexa para não quebrar sites. |
| **Monetização / Versão Pro** | Modelo freemium com recursos avançados de exportação e suporte a modelos cloud. | **M** | Implementação de Stripe/Billing em extensões. |

---

## 🛠️ Notas de Arquitetura & Débito Técnico

1.  **Gerenciamento de Contexto**: O limite de 8.000 caracteres é uma restrição forte do Gemini Nano. Futuramente, precisaremos implementar técnicas de **RAG (Retrieval-Augmented Generation)** local ou sumarização recursiva para páginas muito longas.
2.  **Testes de UI**: Atualmente os testes cobrem apenas os serviços. É necessário adicionar testes de integração para o `sidepanel` usando Puppeteer ou Playwright.
3.  **Segurança**: Garantir que o `content-script` não exponha dados sensíveis entre domínios ao transitar mensagens para o `service-worker`.
