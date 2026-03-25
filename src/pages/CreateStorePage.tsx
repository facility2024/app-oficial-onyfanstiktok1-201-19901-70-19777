import React, { useState } from 'react'; // store page
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { toast } from 'sonner';

const CreateStorePage = () => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    logo_url: '',
    banner_url: '',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, slug: generateSlug(name) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Você precisa estar logado');
      return;
    }
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { error: storeError } = await (supabase as any)
        .from('marketplace_stores')
        .insert({
          owner_id: user.id,
          name: form.name.trim(),
          slug: form.slug.trim(),
          description: form.description.trim() || null,
          logo_url: form.logo_url.trim() || null,
          banner_url: form.banner_url.trim() || null,
          is_active: false,
        });

      if (storeError) {
        if (storeError.message?.includes('duplicate')) {
          toast.error('Este slug já está em uso. Escolha outro nome.');
        } else {
          throw storeError;
        }
        return;
      }

      await (supabase as any)
        .from('user_roles')
        .insert({ user_id: user.id, role: 'shopkeeper' })
        .select()
        .maybeSingle();

      toast.success('Loja criada com sucesso! Aguarde aprovação do administrador.');
      navigate('/minha-loja');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao criar loja: ' + (err.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    return () => {
      document.documentElement.classList.remove('allow-scroll');
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="text-foreground hover:text-foreground/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Store className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">Criar Minha Loja</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-400">
            ⚠️ Sua loja será enviada para aprovação. Após aprovada, você poderá adicionar produtos e começar a vender. A comissão é de <strong>30% para o site</strong> e <strong>70% para você</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Loja *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Minha Loja Incrível"
              required
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL da Loja *</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">/marketplace/loja/</span>
              <Input
                id="slug"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="minha-loja"
                required
                className="bg-muted border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva sua loja..."
              rows={3}
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">URL do Logo</Label>
            <Input
              id="logo"
              value={form.logo_url}
              onChange={e => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
              placeholder="https://..."
              className="bg-muted border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner">URL do Banner</Label>
            <Input
              id="banner"
              value={form.banner_url}
              onChange={e => setForm(prev => ({ ...prev, banner_url: e.target.value }))}
              placeholder="https://..."
              className="bg-muted border-border"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Store className="w-4 h-4 mr-2" />}
            Criar Loja
          </Button>
        </form>
      </main>
    </div>
  );
};

export default CreateStorePage;
