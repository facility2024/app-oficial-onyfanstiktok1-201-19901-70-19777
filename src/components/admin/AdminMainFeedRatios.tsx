import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Brain, RotateCcw, Save } from 'lucide-react';

const SETTING_KEY = 'main_feed_ratios';

type Ratios = {
  enabled: boolean;
  new_pct: number;
  unseen_pct: number;
  popular_pct: number;
  old_pct: number;
};

const DEFAULT_RATIOS: Ratios = {
  enabled: true,
  new_pct: 20,
  unseen_pct: 30,
  popular_pct: 30,
  old_pct: 20,
};

export default function AdminMainFeedRatios() {
  const [ratios, setRatios] = useState<Ratios>(DEFAULT_RATIOS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('admin_settings')
          .select('setting_value')
          .eq('setting_key', SETTING_KEY)
          .maybeSingle();
        if (data?.setting_value) {
          setRatios({ ...DEFAULT_RATIOS, ...(data.setting_value as any) });
        }
      } catch (err) {
        console.warn('load ratios error', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = ratios.new_pct + ratios.unseen_pct + ratios.popular_pct + ratios.old_pct;
  const valid = total === 100;

  const update = (k: keyof Ratios, v: number | boolean) =>
    setRatios((prev) => ({ ...prev, [k]: v as any }));

  const handleSave = async () => {
    if (!valid) {
      toast.error(`A soma deve ser 100%. Atual: ${total}%`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert(
          {
            setting_key: SETTING_KEY,
            setting_value: ratios as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'setting_key' }
        );
      if (error) throw error;
      toast.success('✅ Percentuais do Feed salvos e publicados!');
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setRatios(DEFAULT_RATIOS);

  if (loading) {
    return <div className="p-6 text-white">Carregando…</div>;
  }

  const fields: { key: keyof Ratios; label: string; desc: string }[] = [
    { key: 'new_pct', label: 'Novos (últimas 24h)', desc: 'Vídeos e modelos recém-publicados' },
    { key: 'unseen_pct', label: 'Nunca vistos', desc: 'Ainda não aparecem no seu histórico' },
    { key: 'popular_pct', label: 'Populares', desc: 'Mais visualizados/curtidos' },
    { key: 'old_pct', label: 'Antigos', desc: 'Rotação de acervo' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-7 h-7 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Feed Inteligente — Buckets</h1>
          <p className="text-sm text-gray-400">
            Controle a distribuição da fila do Feed Principal. Não afeta Feed de Ofertas, promos ou anúncios.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-purple-950 to-gray-950 border-purple-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Ativar fila inteligente</span>
            <Switch
              checked={ratios.enabled}
              onCheckedChange={(v) => update('enabled', v)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300">
          Quando desligado, o app usa apenas a lógica clássica de composição. O histórico continua sendo registrado em <code>feed_history</code>.
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Distribuição por bucket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="grid grid-cols-[1fr_120px] gap-3 items-center">
              <div>
                <Label className="text-white font-semibold">{f.label}</Label>
                <p className="text-xs text-gray-400">{f.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={ratios[f.key] as number}
                  onChange={(e) => update(f.key, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="bg-gray-800 border-gray-700 text-white text-right"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>
          ))}

          <div
            className={`mt-2 p-3 rounded-lg border font-bold text-center ${
              valid
                ? 'bg-green-950 border-green-700 text-green-300'
                : 'bg-red-950 border-red-700 text-red-300'
            }`}
          >
            Total: {total}% {valid ? '✓' : '(deve ser 100%)'}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !valid}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando…' : 'Salvar & Publicar'}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Padrão (20/30/30/20)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-300 space-y-2">
          <p>• Cada usuário tem histórico próprio em <code>feed_history</code> com cooldown de 24h.</p>
          <p>• Nunca dois vídeos consecutivos da mesma modelo/criador.</p>
          <p>• Fila de ~50 vídeos com prefetch automático quando restam 10.</p>
          <p>• Alterações entram em vigor na próxima abertura do app (F5 / nova sessão).</p>
        </CardContent>
      </Card>
    </div>
  );
}
