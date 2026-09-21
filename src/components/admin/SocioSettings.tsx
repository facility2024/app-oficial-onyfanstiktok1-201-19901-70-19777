import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Users } from 'lucide-react';

interface Socio {
  id: string;
  name: string;
  neonpay_producer_id: string;
  percentage: number;
  is_active: boolean;
}

export const SocioSettings: React.FC = () => {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProducerId, setNewProducerId] = useState('');
  const [newPercentage, setNewPercentage] = useState('');

  useEffect(() => {
    loadSocios();
  }, []);

  const loadSocios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_socios' as any)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setSocios((data || []) as Socio[]);
    } catch (e: any) {
      console.warn('Erro ao carregar socios:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  const addSocio = async () => {
    if (!newName.trim() || !newProducerId.trim() || !newPercentage.trim()) {
      toast.error('Preencha nome, ID NeonPay e porcentagem');
      return;
    }
    const pct = Number(newPercentage);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      toast.error('Porcentagem deve ser entre 0.01 e 100');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_socios' as any)
        .insert({
          name: newName.trim(),
          neonpay_producer_id: newProducerId.trim(),
          percentage: pct,
          is_active: true,
        });
      if (error) throw error;
      toast.success('Socio adicionado com sucesso');
      setNewName('');
      setNewProducerId('');
      setNewPercentage('');
      loadSocios();
    } catch (e: any) {
      toast.error('Erro ao adicionar socio: ' + (e?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const removeSocio = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_socios' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Socio removido');
      loadSocios();
    } catch (e: any) {
      toast.error('Erro ao remover: ' + (e?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_socios' as any)
        .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(currentActive ? 'Socio desativado' : 'Socio ativado');
      loadSocios();
    } catch (e: any) {
      toast.error('Erro ao atualizar: ' + (e?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const totalPercentage = socios
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.percentage), 0);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-400" />
          Socios — Split NeonPay
        </CardTitle>
        <CardDescription className="text-gray-400">
          Configure os socios que receberao uma porcentagem do valor liquido de cada venda (a pos comissao da plataforma).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-sm text-gray-400">
            Total ativo: <span className={`font-bold ${totalPercentage > 100 ? 'text-red-400' : 'text-green-400'}`}>{totalPercentage.toFixed(1)}%</span>
            {totalPercentage > 100 && (
              <span className="text-red-400 ml-2">(ATENCAO: excede 100%!)</span>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Plataforma retém a comissao configurada, depois o liquido e dividido entre os socios ativos.
          </p>
        </div>

        {/* Lista de socios */}
        {loading ? (
          <div className="text-center py-4 text-gray-400">Carregando socios...</div>
        ) : socios.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Nenhum socio cadastrado</div>
        ) : (
          <div className="space-y-2">
            {socios.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  s.is_active ? 'bg-gray-800 border-gray-600' : 'bg-gray-800/50 border-gray-700 opacity-60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{s.name}</p>
                  <p className="text-gray-400 text-xs font-mono truncate">{s.neonpay_producer_id}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-yellow-400 font-bold text-lg">{Number(s.percentage).toFixed(1)}%</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={`text-xs ${s.is_active ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-400'}`}
                  >
                    {s.is_active ? 'Ativo' : 'Inativo'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeSocio(s.id)}
                    className="border-red-600 text-red-400 hover:bg-red-900/30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adicionar novo socio */}
        <div className="border-t border-gray-700 pt-4 mt-4">
          <p className="text-sm text-gray-400 mb-3 font-semibold">Adicionar novo socio</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Nome</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Joao, Empresa X"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">ID NeonPay (Producer ID)</Label>
              <Input
                value={newProducerId}
                onChange={(e) => setNewProducerId(e.target.value)}
                placeholder="cmn..."
                className="bg-gray-800 border-gray-600 text-white font-mono"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Porcentagem do liquido (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0.01"
                max="100"
                value={newPercentage}
                onChange={(e) => setNewPercentage(e.target.value)}
                placeholder="10"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          <Button
            onClick={addSocio}
            disabled={saving || !newName.trim() || !newProducerId.trim() || !newPercentage.trim()}
            className="mt-3 bg-yellow-600 hover:bg-yellow-700 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Socio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
