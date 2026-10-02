# 🔧 Guia de Correção de Estilos - Big Bang Duel

## 📋 Resumo das Mudanças

### Problema Identificado

Após modificações anteriores no CSS, todas as páginas perderam os estilos customizados porque:

1. Mudamos de `@theme` para `:root`, o que fez o Tailwind v4 parar de reconhecer as cores customizadas
2. Classes como `text-gold`, `bg-sand`, `border-brown-dark` param de funcionar

### Solução Implementada

1. ✅ Restauramos `@theme` no `globals.css` (sintaxe correta do Tailwind v4)
2. ✅ Corrigimos a ordem dos imports CSS
3. ✅ Atualizamos as referências de variáveis CSS
4. ✅ Criamos um Design System completo
5. ✅ Adicionamos scrollbar customizada

---

## 🎨 Como Usar as Cores

### Cores Disponíveis (via Tailwind)

```tsx
// Textos
text - gold; // #FFD700 - Títulos premium
text - sand; // #D4A855 - Textos destacados
text - sand - light; // #F0D080 - Textos claros
text - brown - dark; // #3B1F0A - Textos principais
text - brown - mid; // #7B4A1E - Textos secundários
text - parchment; // #F5E6C8 - Textos em fundos escuros

// Backgrounds
bg - gold;
bg - sand;
bg - sand - light;
bg - brown - dark;
bg - brown - mid;
bg - parchment;
bg - red - west;
bg - sky;

// Borders
border - gold;
border - sand;
border - brown - dark;
border - brown - mid;
```

### Opacidade

```tsx
text - gold / 50; // 50% opacidade
bg - sand / 20; // 20% opacidade
border - gold / 60; // 60% opacidade
```

---

## 🎯 Componentes Padrão

### 1. Botões

#### Botão Western (Padrão)

```tsx
<button className="btn-western">JOGAR SOLO</button>
```

- Usa automaticamente fonte western
- Gradient marrom com sombras 3D
- Hover com lift effect
- Active com press effect

#### Botão Danger (Vermelho)

```tsx
<button className="btn-western btn-danger">SAIR</button>
```

- Gradient vermelho
- Usado para ações destrutivas

#### Botão Sky (Azul)

```tsx
<button className="btn-western btn-sky">CONFIGURAÇÕES</button>
```

- Gradient azul claro
- Usado para ações informativas

### 2. Inputs

```tsx
<input
  type="text"
  className="input-parchment"
  placeholder="Digite seu nome..."
/>
```

- Fundo pergaminho
- Borda marrom
- Focus com brilho dourado

### 3. Cards

#### Card Wood (Principal)

```tsx
<div className="card-wood p-6 rounded-2xl">{/* Conteúdo */}</div>
```

- Gradient marrom simulando madeira
- Textura sutil em linhas
- Usado para painéis principais

#### Card Transparente (Overlay)

```tsx
<div className="bg-black/30 backdrop-blur-sm border-2 border-sand/20 rounded-xl p-4">
  {/* Conteúdo */}
</div>
```

- Fundo escuro semi-transparente
- Blur no fundo
- Usado para overlays e info cards

---

## 🔤 Tipografia

### Fontes Disponíveis

```css
font-western       // Rye - Títulos e botões
font-marker        // Permanent Marker - Elementos desenhados
font-stats         // Oswald - Corpo de texto
```

### Hierarquia de Títulos

#### Título de Página

```tsx
<h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
  TÍTULO PRINCIPAL
</h1>
<p className="text-center font-stats text-sm text-sand/50 mb-6">
  Subtítulo descritivo
</p>
```

#### Título de Seção

```tsx
<h2 className="font-western text-2xl md:text-3xl text-gold mb-4 text-glow-gold">
  SEÇÃO
</h2>
```

#### Título de Card

```tsx
<h3 className="font-western text-xl text-sand-light">Card Title</h3>
```

### Corpo de Texto

```tsx
// Texto principal
<p className="font-stats text-sm md:text-base text-sand-light">
  Conteúdo principal aqui
</p>

// Texto secundário
<p className="font-stats text-xs text-brown-mid opacity-80">
  Informação secundária
</p>

// Código do jogador
<span className="font-mono text-xs text-sand/40 tracking-widest">
  #A1B2C3D4
</span>
```

---

## 📐 Layout Padrão

### Container de Página

```tsx
<div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
  {/* Overlay atmosférico */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

  {/* Conteúdo */}
  <div className="relative z-10 max-w-2xl mx-auto p-4 py-8">
    {/* Seu conteúdo aqui */}
  </div>
</div>
```

---

## ✨ Efeitos e Animações

### Efeitos de Texto

```tsx
text-glow-gold        // Brilho dourado em títulos importantes
drop-shadow-2xl       // Sombra forte para destaque
```

### Animações

```tsx
animate - fade - up; // Fade in com movimento vertical
animate - drop - bounce; // Drop com bounce (usado em títulos)
animate - logo - float; // Float suave (logo do menu)
animate - pulse; // Pulse para chamar atenção
```

### Delays de Animação (Stagger)

```tsx
animate - fade - up - delay - 1;
animate - fade - up - delay - 2;
animate - fade - up - delay - 3;
// ... até delay-5
```

---

## 🎭 Estados Interativos

### Hover

```tsx
// Botões e elementos grandes
hover:scale-105 hover:brightness-110 transition-all

// Links e elementos pequenos
hover:text-gold hover:border-gold/60 transition-colors

// Backgrounds
hover:bg-gold/20 transition-colors
```

### Active

```tsx
active:scale-95 transition-transform
active:brightness-90
```

### Focus (Inputs)

```tsx
focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none
```

### Disabled

```tsx
disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
```

---

## 🏷️ Badges e Labels

### Badge de Raridade

```tsx
{
  /* Comum */
}
<span className="px-3 py-1 rounded-full border border-gray-400 text-gray-300 text-xs font-stats uppercase tracking-widest bg-black/60">
  COMUM
</span>;

{
  /* Raro */
}
<span className="px-3 py-1 rounded-full border border-sky text-sky text-xs font-stats uppercase tracking-widest bg-black/60">
  RARO
</span>;

{
  /* Lendário */
}
<span className="px-3 py-1 rounded-full border border-gold text-gold text-xs font-stats uppercase tracking-widest bg-black/60">
  LENDÁRIO
</span>;
```

### Badge de Status

```tsx
{
  /* Você */
}
<span className="font-stats text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">
  VOCÊ
</span>;

{
  /* Novo */
}
<span className="font-stats text-[9px] text-red-west bg-red-west/10 px-1.5 py-0.5 rounded">
  NOVO
</span>;

{
  /* Notificação */
}
<span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-stats font-bold flex items-center justify-center animate-pulse">
  3
</span>;
```

---

## 🖼️ Avatares

### Avatar Circular

```tsx
<div className="w-10 h-10 rounded-full border-2 border-gold/60 overflow-hidden">
  <img
    src={character.image}
    alt=""
    className="w-full h-full object-cover"
    style={{ objectPosition: getAvatarCrop(characterId) }}
  />
</div>
```

### Tamanhos Comuns

- `w-9 h-9` - Pequeno (player info)
- `w-10 h-10` - Médio (listas)
- `w-16 h-16` - Grande (perfil)
- `w-24 h-24` - Extra grande (destaque)

---

## 📱 Responsividade

### Breakpoints Tailwind

- **sm**: 640px
- **md**: 768px ← PRINCIPAL
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Padrões Responsivos

```tsx
// Texto
text-sm md:text-base lg:text-lg

// Espaçamento
p-4 md:p-6 lg:p-8
gap-2 md:gap-4

// Grid
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

// Tamanhos
w-full md:w-1/2 lg:w-1/3

// Imagens de fundo diferentes
bg-[url('mobile.webp')] md:bg-[url('desktop.webp')]
```

---

## 🔍 Checklist de Correção

### Para Cada Página

- [ ] Header usa `font-western text-4xl md:text-5xl text-gold text-glow-gold`
- [ ] Subtítulo usa `text-center font-stats text-sm text-sand/50`
- [ ] Botões usam `btn-western` (+ variantes)
- [ ] Cards usam `card-wood` ou `bg-black/30 backdrop-blur-sm`
- [ ] Textos principais usam `text-sand-light` ou `text-brown-dark`
- [ ] Todos os elementos interativos têm `transition-*`
- [ ] Container principal tem `max-w-*xl mx-auto p-4`
- [ ] Background usa imagens portrait/landscape responsivas

### Testes Visuais

1. Abrir página no browser
2. Verificar cores estão corretas
3. Testar hover em botões e links
4. Verificar responsividade (redimensionar janela)
5. Confirmar animações funcionando

---

## 🚀 Acessando o Design System

1. Faça login na aplicação
2. Navegue para `/design-system` na URL
3. Ou adicione temporariamente um botão no menu:

```tsx
<button
  onClick={() => navigate("/design-system")}
  className="btn-western btn-sky"
>
  DESIGN SYSTEM
</button>
```

---

## 🎯 Páginas que Precisam de Atenção

### ✅ Já Corrigidas

- [x] LoginScreen - Convertido para hex inline
- [x] Design System - Nova página de showcase

### ⚠️ Precisam Verificação

- [ ] MenuPage
- [ ] CharactersPage
- [ ] OnlineLobby
- [ ] Leaderboard
- [ ] ProfilePage
- [ ] FriendsPage
- [ ] GameArena
- [ ] GameOver
- [ ] GamePauseMenu
- [ ] TurnResult

**Status**: Todas devem estar funcionando agora com `@theme`, mas precisam de teste visual.

---

## 📝 Notas Técnicas

### Tailwind CSS v4

- Usa `@tailwindcss/vite` plugin
- Configuração via `@theme` no CSS (não TypeScript config)
- Imports devem estar na ordem: Google Fonts → Tailwind → Custom CSS → @theme

### Variáveis CSS

- Definidas em `@theme` para Tailwind usar
- Também disponíveis como `var(--color-*)` para uso direto
- Prefixo `--color-` para cores, `--font-family-` para fontes

### Classes Utilitárias Customizadas

- `.btn-western` e variantes
- `.input-parchment`
- `.card-wood`
- `.text-glow-gold`
- `.custom-scrollbar`

---

**Última Atualização**: 06/03/2026  
**Próximo Passo**: Testar todas as páginas visualmente e ajustar conforme necessário
