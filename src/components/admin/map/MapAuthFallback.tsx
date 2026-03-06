import { AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

interface MapAuthFallbackProps {
  currentOrigin: string;
  keyPreview: string;
}

const getReferrerFromOrigin = (origin: string) => {
  if (!origin || origin === 'origem desconhecida') return '';
  return `${origin}/*`;
};

export const MapAuthFallback = ({ currentOrigin, keyPreview }: MapAuthFallbackProps) => {
  const referrers = [
    getReferrerFromOrigin(currentOrigin),
    'https://*.lovable.app/*',
    'https://*.lovableproject.com/*',
    'https://app-oficial-coconudi.com/*',
    'https://www.app-oficial-coconudi.com/*',
  ].filter(Boolean);

  const copyReferrers = async () => {
    try {
      await navigator.clipboard.writeText(referrers.join('\n'));
      toast({
        title: 'Referenciadores copiados',
        description: 'Cole direto na configuração da chave no Google Cloud Console.',
      });
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie manualmente os domínios listados abaixo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Google Maps bloqueado pela configuração da chave
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-muted-foreground">Origem atual: <span className="font-medium">{currentOrigin}</span></p>
          <p className="text-muted-foreground">Chave ativa: <span className="font-medium">{keyPreview}</span></p>

          <div className="space-y-1">
            <p className="font-medium">Adicione estes HTTP referrers na chave:</p>
            <div className="flex flex-wrap gap-1.5">
              {referrers.map((ref) => (
                <Badge key={ref} variant="secondary" className="text-[10px]">
                  {ref}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={copyReferrers}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar referrers
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Abrir Google Cloud
            </Button>
          </div>

          <p className="text-muted-foreground">Também confirme que a API <span className="font-medium">Maps JavaScript API</span> está habilitada para esta chave.</p>
        </CardContent>
      </Card>
    </div>
  );
};
