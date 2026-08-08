# Cloudflare Worker — Share Proxy CocoNudi

Esconde a URL do Supabase no compartilhamento (WhatsApp, Instagram, etc).

**Antes:** `https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/share-video/abc123`
**Depois:** `https://share.coconudi.com/v/abc123`

---

## Passo a passo (5 minutos)

### 1. Criar o Worker no Cloudflare

1. Entre no [dashboard Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Create Worker**
2. Nome: `coconudi-share-proxy`
3. Clique **Deploy** (código placeholder), depois **Edit code**
4. Cole todo o conteúdo de `share-proxy.js` (deste diretório) no editor
5. **Save and Deploy**

### 2. Ligar o subdomínio `share.coconudi.com` ao Worker

1. Ainda no Worker → aba **Settings** → **Domains & Routes** → **Add** → **Custom Domain**
2. Digite: `share.coconudi.com`
3. Clique **Add Domain**

O Cloudflare cria o registro DNS automaticamente (proxied ✅) e emite o SSL.

### 3. Pronto — testar

Abra no navegador:
```
https://share.coconudi.com/v/COLE_UM_UUID_DE_VIDEO_AQUI
```
Deve redirecionar pro app. Cole o mesmo link no WhatsApp — o card deve mostrar título, thumb e nome da modelo, e a URL visível será `share.coconudi.com/v/...`.

---

## Trocar de subdomínio

Se preferir `s.coconudi.com` ou `link.coconudi.com`, basta usar esse nome no passo 2. Não precisa mexer no código do Worker.

## Rollback

Se algo der errado, é só remover o Custom Domain do Worker — o app continua funcionando via URL do Supabase (fallback já está pronto).
