# 🎨 Big Bang Duel - Design System

## 📋 Visão Geral

Sistema de design Western-themed para consistência visual em toda a aplicação.

---

## 🎨 Paleta de Cores

### Cores Primárias

```css
--color-sand: #d4a855 /* Dourado areia - fundos, destaques */
  --color-sand-light: #f0d080 /* Areia clara - textos claros */
  --color-gold: #ffd700 /* Ouro - elementos premium, títulos */
  --color-parchment: #f5e6c8 /* Pergaminho - cards, inputs */;
```

### Cores Neutras

```css
--color-brown-dark: #3b1f0a /* Marrom escuro - textos, bordas */
  --color-brown-mid: #7b4a1e /* Marrom médio - textos secundários */
  --color-brown-light: #a0522d /* Marrom claro - elementos terciários */
  --color-black-ink: #1a0a00 /* Preto tinta - textos principais */;
```

### Cores de Ação

```css
--color-red-west: #c0392b /* Vermelho western - perigo, ações críticas */
  --color-red-700: #8b0000 /* Vermelho escuro - botões danger hover */
  --color-sky: #87ceeb /* Azul céu - informações, links */;
```

### Cores Decorativas

```css
--color-sunset-1: #ff6b35 /* Pôr do sol 1 - gradientes */
  --color-sunset-2: #f7c59f /* Pôr do sol 2 - gradientes */;
```

---

## 🔤 Tipografia

### Fontes

- **Western (Rye)**: Títulos e headings principais
- **Marker (Permanent Marker)**: Elementos desenhados à mão
- **Stats (Oswald)**: Corpo de texto, estatísticas, UI

### Hierarquia

```css
/* Título Principal */
.font-western text-4xl md:text-5xl text-gold text-glow-gold

/* Título Secundário */
.font-western text-2xl md:text-3xl text-gold text-glow-gold

/* Título de Card */
.font-western text-xl md:text-2xl text-sand-light

/* Corpo de Texto */
.font-stats text-sm md:text-base text-brown-dark

/* Texto Pequeno */
.font-stats text-xs text-brown-mid

/* Código do Jogador */
.font-mono text-xs text-sand/40 tracking-widest
```

---

## 🎯 Componentes Padrão

### Botões

#### Botão Western (Padrão)

```tsx
<button className="btn-western">TEXTO DO BOTÃO</button>
```

**Uso**: Ações principais, navegação

#### Botão Danger

```tsx
<button className="btn-western btn-danger">SAIR / CANCELAR</button>
```

**Uso**: Ações destrutivas, logout, cancelamentos

#### Botão Sky (Info)

```tsx
<button className="btn-western btn-sky">CONFIGURAÇÕES</button>
```

**Uso**: Ações informativas, configurações

### Inputs

#### Input Parchment

```tsx
<input type="text" className="input-parchment" placeholder="Digite aqui..." />
```

**Uso**: Todos os campos de texto

### Cards

#### Card Wood (Madeira)

```tsx
<div className="card-wood p-6 rounded-2xl">{/* Conteúdo */}</div>
```

**Uso**: Painéis principais, modais, cards de personagem

#### Card Transparente com Borda

```tsx
<div className="bg-black/30 backdrop-blur-sm border-2 border-sand/20 rounded-xl p-4">
  {/* Conteúdo */}
</div>
```

**Uso**: Cards secundários, overlay information

---

## 🎭 Efeitos e Animações

### Efeitos de Texto

```css
/* Brilho Dourado */
.text-glow-gold

/* Sombra de Texto */
.drop-shadow-2xl
```

### Animações

```css
/* Fade In com movimento vertical */
.animate-fade-up

/* Drop com bounce */
.animate-drop-bounce

/* Float suave (logo) */
.animate-logo-float

/* Pulse para destaque */
.animate-pulse
```

---

## 📐 Layout Padrão

### Container de Página

```tsx
<div className="min-h-screen bg-[url('/assets/ui/bg_desert_portrait.webp')] md:bg-[url('/assets/ui/bg_desert_landscape.webp')] bg-cover bg-center relative overflow-hidden">
  {/* Overlay de atmosfera */}
  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none" />

  {/* Conteúdo */}
  <div className="relative z-10 max-w-2xl mx-auto p-4">
    {/* Seu conteúdo aqui */}
  </div>
</div>
```

### Header de Página

```tsx
<h1 className="font-western text-4xl md:text-5xl text-gold text-center mb-2 text-glow-gold animate-drop-bounce">
  TÍTULO DA PÁGINA
</h1>
<p className="text-center font-stats text-sm text-sand/50 mb-6">
  Subtítulo descritivo
</p>
```

---

## 🎨 Estados Visuais

### Hover States

```css
/* Botões */
hover:brightness-110 hover:scale-105 transition-all

/* Links e elementos interativos */
hover:text-gold hover:border-gold/60 transition-colors
```

### Active/Focus States

```css
/* Botões */
active:scale-95 transition-transform

/* Inputs */
focus:border-gold focus:ring-2 focus:ring-gold/25
```

### Disabled States

```css
disabled:opacity-50 disabled:cursor-not-allowed
```

---

## 📊 Badges e Labels

### Badge de Raridade

```tsx
{
  /* Comum */
}
<span className="px-3 py-1 rounded-full border border-gray-400 text-gray-300 text-xs font-stats uppercase tracking-widest">
  COMUM
</span>;

{
  /* Raro */
}
<span className="px-3 py-1 rounded-full border border-sky-400 text-sky-300 text-xs font-stats uppercase tracking-widest">
  RARO
</span>;

{
  /* Lendário */
}
<span className="px-3 py-1 rounded-full border border-gold text-gold text-xs font-stats uppercase tracking-widest">
  LENDÁRIO
</span>;
```

### Badge de Status

```tsx
<span className="font-stats text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded">
  VOCÊ
</span>
```

---

## 🎯 Boas Práticas

### ✅ DO's

- Use classes utilitárias do Tailwind para consistência
- Sempre adicione transições em elementos interativos
- Use `font-western` para títulos e botões
- Use `font-stats` para texto corrido
- Aplique `text-glow-gold` em títulos importantes
- Use responsive design (md:, lg: breakpoints)

### ❌ DON'Ts

- Não use cores hardcoded (use as variáveis CSS)
- Não misture estilos inline com classes quando desnecessário
- Não use animações excessivas que distraem
- Não esqueça estados hover/active em elementos clicáveis
- Não ignore acessibilidade (aria-labels, alt text)

---

## 🚀 Exemplos de Uso

### Botão de Menu

```tsx
<button className="btn-western animate-fade-up">JOGAR SOLO</button>
```

### Card de Personagem

```tsx
<div className="card-wood rounded-2xl overflow-hidden shadow-2xl">
  <img src={character.image} alt={character.name} className="w-full h-auto" />
  <div className="p-4">
    <h3 className="font-western text-xl text-gold">{character.name}</h3>
    <p className="font-stats text-sm text-sand-light/80">{character.title}</p>
  </div>
</div>
```

### Avatar com Border

```tsx
<div className="w-10 h-10 rounded-full border-2 border-gold/60 overflow-hidden">
  <img src={avatar} alt="" className="w-full h-full object-cover" />
</div>
```

---

## 📱 Responsividade

### Breakpoints

- **sm**: 640px (pequeno)
- **md**: 768px (médio) - PRINCIPAL
- **lg**: 1024px (grande)
- **xl**: 1280px (extra grande)

### Padrões Responsivos

```css
/* Texto */
text-sm md:text-base lg:text-lg

/* Espaçamento */
p-4 md:p-6 lg:p-8

/* Grid */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3

/* Imagens de fundo */
bg-[url('mobile.webp')] md:bg-[url('desktop.webp')]
```

---

## 🔧 Manutenção

### Adicionando Novas Cores

1. Adicione a variável em `globals.css` dentro da diretiva `@theme`
2. Documente aqui no Design System
3. Atualize componentes existentes se necessário

### Criando Novos Componentes

1. Siga os padrões estabelecidos
2. Reutilize classes existentes
3. Documente no Design System
4. Adicione exemplos de uso

---

**Última Atualização**: 06/03/2026
**Versão**: 1.0.0
