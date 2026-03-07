# Sistema de Progressao v1: Nivel, XP, Ouro e Trofeus

## Objetivo
Dar proposito ao jogo com progressao de medio prazo, cap inicial em nivel 10 e economia base para futuras features (loja, cosmetics, ruby e arenas).

## Balanco v1 (ajustado)
- XP cumulativo para nivel 10: `30.000`
- Curva cumulativa recomendada: `0, 120, 420, 1.000, 2.100, 4.000, 7.000, 11.500, 18.500, 30.000`
- XP por partida solo (metade do plano inicial):
- Vitoria: `90-120`
- Derrota: `28-40`
- Empate: `45-60`
- Bonus online: `+10%` em XP e ouro
- Ouro por partida solo:
- Vitoria: `35-55`
- Derrota: `12-20`
- Empate: `18-30`
- Trofeus (somente online):
- Vitoria: `+27..+33`
- Derrota: `-13..-7`
- Empate: `0`
- Piso de trofeus: `0`

## Recompensas de level-up
- Nivel 2: `+120 ouro`
- Nivel 3: `+200 ouro` + unlock `the_cowboy`
- Nivel 4: `+320 ouro`
- Nivel 5: `+450 ouro` + unlock `detective_hopps`
- Nivel 6: `+620 ouro`
- Nivel 7: `+820 ouro` + unlock `stormtrooper`
- Nivel 8: `+1100 ouro`
- Nivel 9: `+1450 ouro`
- Nivel 10: `+2000 ouro` + unlock `pe_de_pano`

## Escopo desta implementacao
- Tipos de progresso/economia/ranked/unlocks adicionados ao dominio
- Motor central de progressao em `src/lib/progression.ts`
- Integracao completa no fluxo de fim de partida (`GameOver` -> `recordMatchResult`)
- Persistencia em Firestore de XP, gold, trofeus e unlocks
- TopBar com nivel/XP/gold/trofeus reais
- Perfil com secao de progressao, moedas, trofeus e desbloqueios
- Ranking online com opcao de ordenar por trofeus
- Personagens bloqueados ate desbloqueio por nivel

## Fases seguintes
1. Loja de personagens/cosmeticos usando gold
2. Introducao de ruby e fontes de obtenção
3. Sistema de arenas por faixa de trofeus
4. Ajuste fino por telemetria real

## Arquivos principais
- `src/lib/progression.ts`
- `src/lib/firebaseService.ts`
- `src/components/game/GameOver.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/leaderboard/Leaderboard.tsx`
- `src/pages/profile.tsx`
- `src/pages/characters.tsx`
- `src/store/authStore.ts`
- `src/types/index.ts`
- `firestore.rules`
