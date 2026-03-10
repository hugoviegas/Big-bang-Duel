Branch: feat/ai-history5-double2
Base: main
Date: 2026-03-09

## Resumo das mudanças nesta branch

- Redesign mobile-first completo da tela de batalha:
  - Cards agora dimensionam por viewport (`w-[calc(18vw-4px)]`, `max-w-[88px]`, `aspect-[5/7]`) para responsividade melhor em telas pequenas.
  - Botão de confirmar transformado em botão circular flutuante posicionado acima/direita das cartas.
  - Espaçamento e gaps adaptativos (`gap-[2vw]`) para manter proporções em diferentes larguras.

- Personagens e animações:
  - Tamanho responsivo dos personagens (`w-[35vw]`, `max-w-[180px]`) e centralizados verticalmente.
  - Corrigido bug de personagem que desaparecia ao pedir revanche: adicionado `key={avatar + "-" + life}` no `motion.img` para forçar remount nas novas partidas.

- Tela GameOver:
  - Removida margem negativa que cortava a imagem do personagem; layout tornouse scrollable (`items-start overflow-y-auto`) para evitar cortes.

- Arquivos modificados (principais):
  - `src/components/game/CardHand.tsx` — nova disposição do hand, timer SVG ajustado (r=12), confirm flutuante.
  - `src/components/game/CardItem.tsx` — sizing e tipografia responsiva dos cards.
  - `src/components/game/GameArena.tsx` — container ajustado (`h-[100svh] pb-[180px]`) para reservar espaço ao hand.
  - `src/components/game/Character.tsx` — correções de key e sizing.
  - `src/components/game/GameOver.tsx` — correção de crop e layout.
  - `src/styles/battleHeader.css` — valores reduzidos para header compacto (ajustes estéticos).
  - `tailwind.config.ts` — adicionado breakpoint `xs: '375px'` e `spacing.safe`.

- Build / verificação:
  - `npx vite build` executado com sucesso no ambiente local; artefatos gerados em `dist/`.
  - Aviso de tamanho de chunk (>500KB) gerado pelo Vite/Rollup — recomendação: code-split se necessário.

## Notas de implantação

- Branch atual: `feat/ai-history5-double2` (a ação de push criará o branch remoto se ainda não existir).
- PR será aberto contra `main` com este arquivo como corpo da descrição.

## Testes recomendados após merge

- Abrir a tela de batalha em mobile (375x812) e validar: cards, botão confirmar, personagens centrados.
- Testar revanche/local e rematch online (garantir que personagem remonta corretamente).
- Validar GameOver scroll e imagem do vencedor.

Se quiser, eu posso ajustar `max-w` dos cards/personagens ou adicionar mais breakpoints após seu review.
