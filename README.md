# 🔎 PageWhisperer — Resumidor de Páginas com IA Nativa (Chrome Extension)

![Status](https://img.shields.io/badge/Status-Beta--V1.1-brightgreen)
![Versão](https://img.shields.io/badge/Versão-1.1.0-blue)
![Licença](https://img.shields.io/github/license/matheuspolli/pagewhisperer?color=yellow)
![Chrome AI](https://img.shields.io/badge/Chrome%20Built--in%20AI-Gemini%20Nano-blue)

**PageWhisperer** é uma extensão para Google Chrome (Manifest V3) que injeta um painel lateral inteligente em qualquer página da web. Utilizando o **Gemini Nano** (IA nativa do Chrome), a ferramenta oferece resumos estruturados, extração de pontos-chave e uma interface de Q&A (perguntas e respostas) — tudo processado 100% localmente e offline.

---

## 🚀 Novidades da Versão 1.1.0

- **Extração Inteligente (Readability-style)**: Agora a extensão ignora menus, anúncios e sidebars automaticamente, focando apenas no conteúdo principal da página.
- **Histórico Local de Resumos**: Acesse seus últimos 5 resumos diretamente na tela inicial, salvos de forma privada no seu navegador.
- **Ferramentas de Exportação**: 
  - **Copiar**: Botão dedicado para copiar o resumo para a área de transferência com feedback visual.
  - **Exportar MD**: Baixe o resumo formatado em Markdown (.md) para seu Notion ou Obsidian.
- **Atalhos de Teclado**: Abra o painel instantaneamente com `Ctrl+Shift+P` (Windows/Linux) ou `Cmd+Shift+P` (Mac).
- **Feedback de Download**: Acompanhe o progresso real do download do modelo Gemini Nano diretamente na interface.
- **Detecção de Idioma Automática**: Tradução inteligente que detecta o idioma de origem da página antes de traduzir para PT-BR.
- **Resiliência e Confiabilidade**: Sistema de auto-retry (2 tentativas) e fallback neutro para garantir que você nunca fique sem resposta.

---

## 🚀 Funcionalidades Principais

- **Resumo em 4 Modos**:
  - `Normal`: Resumo executivo claro e conciso.
  - `Técnico`: Focado em arquitetura, código e especificações (para desenvolvedores).
  - `ELI5`: Explicação simplificada (Explain Like I'm 5) com analogias.
  - `Ações`: Extração de decisões, tarefas e próximos passos.
- **Interface de Q&A**: Tire dúvidas específicas sobre o conteúdo da aba ativa.
- **Tradução Inteligente**: Tradução instantânea para Português (PT-BR) via Chrome Translator API com detecção automática.
- **Privacidade Total**: O conteúdo da página nunca sai do seu navegador. Processamento 100% local.

---

## 📋 Pré-requisitos (Configuração do Ambiente)

Como o projeto utiliza APIs experimentais do Chrome, é necessário habilitar as seguintes flags em `chrome://flags`:

1.  **Prompt API for Gemini Nano**: `#prompt-api-for-gemini-nano` → `Enabled`
2.  **Translation API**: `#translation-api` → `Enabled`
3.  **Language Detection API**: `#language-detector-api` → `Enabled`
4.  **Optimization Guide On-Device Model**: `#optimization-guide-on-device-model` → `Enabled BypassPrefRequirement`

**Reinicie o Chrome** após habilitar. O download do modelo (~1.5GB) ocorrerá automaticamente no primeiro uso.

---

## 🛠️ Instalação (Modo Desenvolvedor)

1.  Clone este repositório: `git clone https://github.com/matheuspolli/pagewhisperer.git`
2.  Abra o Chrome e acesse `chrome://extensions/`.
3.  Ative o **Modo do desenvolvedor** (canto superior direito).
4.  Clique em **Carregar sem compactação** e selecione a pasta raiz do projeto.
5.  Fixe o ícone do PageWhisperer na sua barra de ferramentas.

---

## 👤 Autor

Matheus Gasparotto Polli

---

## 📄 Licença
Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
🎓 Engenharia de Software com IA Aplicada — UNIPDS
