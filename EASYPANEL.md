# Deploy no EasyPanel

## Configuração

- **Repositório GitHub**: `facility2024/app-oficial-onyfanstiktok1-201-19901-70-19777`
- **Branch**: `master`
- **Tipo de construção**: Dockerfile
- **Porta**: 3000

## Variáveis de Ambiente

Configure no EasyPanel → Serviço → Environment:

```env
VITE_SUPABASE_URL=https://tnzvhwapfhkhqjgyiomk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuenZod2FwZmhraHFqZ3lpb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjM5MzUsImV4cCI6MjA2OTQzOTkzNX0.mWv0UEbkeczgKUMRaDm94Azo3Olgu3-sOnkZ7kamWuM
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBrc4pw_t0SjM2RzjfgQiWUfhzfC_lEOfM
```

## Deploy Automático

1. Acesse o EasyPanel → seu serviço → aba **Github**
2. Verifique que o branch está como `master`
3. Ative **Auto Deploy** (se disponível)
4. A cada push no GitHub, o EasyPanel detecta e faz deploy automático

## Deploy Manual

Se o deploy automático não funcionar:
1. EasyPanel → Serviço → Clique em **Implantar**

## Porta

O aplicativo escuta na porta **3000**. No EasyPanel, configure o **Port** do serviço como `3000`.

## Troubleshooting

- **Build falhou**: Verifique os logs no EasyPanel → Serviço → Logs
- **Deploy não inicia**: Clique em "Implantar" manualmente
- **Aplicação não responde**: Verifique se a porta 3000 está exposta corretamente
