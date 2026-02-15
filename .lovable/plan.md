
## Problema Identificado

O menu lateral esquerdo no desktop e construido diretamente dentro do `TikTokApp.tsx` (linhas 2768-2855), separado do `CategoryMenu.tsx` que so aparece no mobile. O item "Live" foi adicionado ao `CategoryMenu.tsx` mas **nunca foi adicionado ao menu desktop** no `TikTokApp.tsx`.

## Solucao

Adicionar o botao "Live" no menu lateral desktop do `TikTokApp.tsx`, logo abaixo do botao "Video Chamada" (linha 2782), com o mesmo estilo visual (icone vermelho pulsando e vibrando).

## Alteracoes

### Arquivo: `src/pages/TikTokApp.tsx`

Inserir entre o botao "Video Chamada" (linha 2782) e o botao "Seguindo" (linha 2783) um novo botao:

```text
<button onClick={() => {
  toast.info('Em breve! Acesse o perfil da modelo para ver se esta ao vivo.');
}} className="w-full flex items-center px-6 py-3 text-white hover:bg-white/10 transition-colors">
  <span className="relative inline-flex items-center justify-center mr-3">
    <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
    <Radio className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-[vibrate_0.3s_linear_infinite]" strokeWidth={1.5} />
  </span>
  <span>Live</span>
</button>
```

- Icone `Radio` com cor vermelha, efeito ping e vibracao (identico ao do `CategoryMenu`)
- Ao clicar, exibe toast informativo (mesma logica do mobile)
- Verificar que o import de `Radio` ja existe no arquivo

### Verificacao de import

Confirmar que `Radio` de `lucide-react` ja esta importado no `TikTokApp.tsx`. Caso nao esteja, adicionar ao import existente.

## Resultado Esperado

O menu lateral esquerdo do desktop tera:
1. Video Chamada (icone verde pulsando)
2. **Live** (icone vermelho pulsando) -- NOVO
3. Seguindo
4. Marketplace
5. Negocios Locais
6. Colecoes
7. (demais itens)
