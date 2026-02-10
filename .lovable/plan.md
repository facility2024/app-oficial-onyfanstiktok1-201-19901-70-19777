

## Remover Preloads Desnecessarios do index.html

### Problema
O navegador avisa que imagens foram pré-carregadas mas não usadas nos primeiros segundos. Isso não causa erros, mas polui o console e desperdiça banda em páginas onde essas imagens não aparecem.

### Solucao
Remover as 5 tags `<link rel="preload" as="image">` do `index.html` (linhas 36-40). Essas imagens serão carregadas normalmente quando necessárias pelos componentes que as utilizam.

### Detalhes Tecnicos

**Arquivo:** `index.html`

Remover estas linhas:
```html
<link rel="preload" as="image" href="/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png">
<link rel="preload" as="image" href="/lovable-uploads/24a5e9ee-1a77-472c-ac34-4fa227321806.png">
<link rel="preload" as="image" href="/lovable-uploads/2746651e-70a4-4bbc-bb71-54ba126863ca.png">
<link rel="preload" as="image" href="/lovable-uploads/2955b0a9-b6b4-486b-9318-e326c29ab668.png">
<link rel="preload" as="image" href="/lovable-uploads/3daf81d3-7b41-4709-bb93-5ce0bf4ec3d6.png">
```

**Nota:** A imagem `2955b0a9` usada como apple-touch-icon continuará funcionando normalmente pois o `<link rel="apple-touch-icon">` já cuida do carregamento dela.

### Impacto
- Elimina os avisos no console
- Reduz levemente o tempo de carregamento inicial (menos requests paralelos)
- Zero impacto visual — as imagens carregam quando os componentes que as usam são montados

