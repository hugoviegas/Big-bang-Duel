# Big Bang Duel

> Um duelo tatico com leitura de padrao, gestao de municao, progressao de conta e modos online/solo.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-1f6feb)
![Stack](https://img.shields.io/badge/stack-React%20%7C%20TypeScript%20%7C%20Firebase-0ea5e9)
![Build](https://img.shields.io/badge/build-Vite-7c3aed)
![License](https://img.shields.io/badge/license-Proprietary%20%28All%20Rights%20Reserved%29-critical)

---

## Visao Geral

**Big Bang Duel** e um jogo de confronto por turnos focado em decisao, risco e previsao.
Cada rodada exige leitura do adversario, controle de recursos e timing perfeito de cartas.

### Pilar de gameplay

- Decisoes rapidas com alta profundidade tatico-estrategica
- Sistema de cartas com interacoes claras e contra-jogadas fortes
- Progressao persistente com nivel, XP, ouro, trofeus e desbloqueios
- Experiencia com foco mobile e suporte a recursos online

---

## Principais Recursos

- Autenticacao e perfil de jogador com Firebase
- Modo solo e modo online
- Match history e leaderboard
- Sistema de missoes e conquistas
- Inventario/progressao com desbloqueio de personagens
- Bot AI evolutiva com analise de expectativa de valor (EV)
- Layout otimizado para telas mobile e safe-area iOS

---

## Como o Duelo Funciona

O combate gira em torno de 5 acoes principais:

- `reload`
- `shot`
- `double_shot`
- `dodge`
- `counter`

O resultado depende do pareamento de cartas entre os dois jogadores em cada turno,
com impacto direto em dano e municao. O jogo recompensa leitura de padrao e gestao de risco.

---

## Stack Tecnica

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Estado:** Zustand
- **Backend/Infra:** Firebase (Auth, Firestore e regras)
- **Animacoes:** Framer Motion
- **Audio:** Howler
- **Roteamento:** React Router
- **Estilo:** Tailwind CSS 4
- **Testes:** Vitest + Playwright

---

## Estrutura do Projeto

```text
duelo/
  src/
    components/      # UI por dominio (game, lobby, leaderboard, etc.)
    pages/           # Rotas da aplicacao
    lib/             # Regras de negocio, IA, servicos Firebase
    hooks/           # Hooks customizados
    store/           # Estado global (auth, jogo, preferencias)
    styles/          # Tokens/estilos auxiliares
  public/            # Assets estaticos (personagens, cartas, UI)
  e2e/               # Testes Playwright
  tests/             # Testes de integracao
  training/          # Treinamento/benchmark da IA
```

---

## Requisitos

- Node.js 20+
- npm 10+
- Projeto Firebase configurado (Auth/Firestore)

---

## Instalacao

```bash
npm install
```

### Configurar variaveis de ambiente

Crie/edite o arquivo `.env` na raiz de `duelo/`:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=gemini-2.5-flash
```

> Importante: nao commitar chaves reais em repositores publicos.

---

## Scripts Disponiveis

```bash
npm run dev              # ambiente local
npm run build            # build de producao
npm run preview          # preview local do build
npm run lint             # analise de lint

npm run test             # testes unitarios (execucao unica)
npm run test:watch       # testes em watch mode
npm run test:coverage    # cobertura de testes
npm run test:integration # testes de integracao
npm run test:e2e         # testes end-to-end
npm run test:ci          # pipeline de testes para CI
```

---

## Fluxo de Desenvolvimento

1. Configure o `.env`
2. Execute `npm run dev`
3. Desenvolva features por modulo (`components`, `pages`, `lib`)
4. Rode `npm run lint` e `npm run test`
5. Valide com `npm run test:e2e` antes de release

---

## Qualidade e Testes

- Testes unitarios para regras criticas de jogo e IA
- Testes de integracao para fluxos essenciais
- E2E com Playwright para validacao de comportamento real de usuario

Recomendacao de baseline local:

```bash
npm run lint && npm run test && npm run test:e2e
```

---

## Roadmap

- Balanceamento continuo de cartas e metagame
- Melhorias no matchmaking e experiencia online
- Evolucao da IA e telemetria de decisao
- Conteudo sazonal e novos desbloqueios

---

## Licenca e Uso

Este projeto e **proprietario** e esta protegido por **All Rights Reserved**.

- Nao e permitido copiar, redistribuir, sublicenciar, publicar ou vender este software
- Nao e permitido uso comercial sem autorizacao formal por escrito
- Nao e permitido reutilizar codigo-fonte, assets, personagens, identidade visual ou logica de jogo

Leia o arquivo `LICENSE` para os termos completos.

---

## Creditos

Projeto desenvolvido por **Hugo Viegas** e colaboradores.

Se quiser contribuir internamente (time autorizado), abra issue com contexto tecnico,
evidencias e proposta de implementacao.
