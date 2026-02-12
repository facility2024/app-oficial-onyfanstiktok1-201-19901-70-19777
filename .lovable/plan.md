

# Trocar o Banner do Marketplace

## Problema
O banner "ATUALIZAÇÃO MENSAL" (roxo/rosa) ainda aparece no marketplace. A imagem que foi salva anteriormente nao corresponde ao banner correto que voce enviou ("LOJINHA DA COCO NUDI").

## Solucao

1. Copiar a imagem correta (`user-uploads://Moedas_coconudi.png`) para `src/assets/banner-atualizacao-mensal.png`, substituindo o arquivo atual
2. O codigo em `MarketplacePage.tsx` ja referencia esse arquivo, entao nenhuma alteracao de codigo sera necessaria -- apenas a troca do arquivo de imagem

## Resultado
O banner roxo/rosa sera substituido pelo banner preto com "LOJINHA DA COCO NUDI" que contem o personagem, os logos de Terapia do Sexo, Video Chamada, Moedas CocoNudi e Revistas Digitais.

