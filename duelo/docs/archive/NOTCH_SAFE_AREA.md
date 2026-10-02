# Suporte a Notch / Dynamic Island (Safe Area)

## Problema

Quando o aplicativo é instalado como PWA ou atalho na tela inicial do iOS (especialmente iPhone X+, iPhone 12, 13, 14, etc.), o notch ou Dynamic Island pode bloquear o conteúdo do topo da tela.

## Solução Implementada

### 1. Meta Tag `viewport-fit=cover` ✅

**Localização:** `index.html` line 6

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

Essa meta tag instrui o navegador a:

- Estender o conteúdo por trás do notch/Dynamic Island
- Fornecer as variáveis CSS de ambiente `safe-area-inset-*`

### 2. CSS com Variáveis de Ambiente Safe Area

#### TopBar (Topo)

**Localização:** `src/styles/mobileLayout.css` line 56-69

```css
.top-bar {
  padding: max(0px, env(safe-area-inset-top, 0px)) 14px 0 14px;
  /* ... outras propriedades */
}
```

#### BottomNav (Inferior)

**Localização:** `src/styles/mobileLayout.css` (já implementado)

```css
.bottom-nav {
  height: calc(68px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

## Como Funciona

As variáveis CSS `env(safe-area-inset-*)` fornecem automaticamente:

- `safe-area-inset-top`: espaço em branco no topo (notch/Dynamic Island)
- `safe-area-inset-bottom`: espaço em branco na base (home indicator)
- `safe-area-inset-left`: espaço na esquerda (notch em landscape)
- `safe-area-inset-right`: espaço na direita (notch em landscape)

### Comportamento:

- **No navegador normal:** Valor é `0px` (não há notch)
- **Na PWA instalada (iOS):** Valor ajusta automaticamente (ex: 47px para iPhone 14)
- **Android:** Geralmente não tem notch/safe area, mas alguns modelos podem suportar

## Testando

### iOS (iPhone X ou superior):

1. Abra `https://seu-dominio.com` no Safari
2. Toque em Compartilhar > Adicionar à Tela Inicial
3. Abra o atalho como app
4. O conteúdo agora deve ter padding automático sob o notch

### Android com notch:

1. Abra em Chrome
2. Menu > "Instalar app"
3. O padding será aplicado se o navegador reconhecer a safe area

## Alternativas de Uso

Se precisar de espaço adicional garantido apenas em dispositivos específicos:

```css
/* Só TopBar */
.top-bar {
  padding-top: max(20px, env(safe-area-inset-top, 0px));
}

/* Conteúdo principal (não necessário, TopBar já protege) */
main {
  padding-top: env(safe-area-inset-top, 0px);
}

/* Se quiser espaço em todos os 4 lados */
.mobile-shell {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
}
```

## Referências

- [MDN - env()](<https://developer.mozilla.org/en-US/docs/Web/CSS/env()>)
- [WebKit - Designing Web Pages for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Apple Human Interface Guidelines - Safe Area](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)
