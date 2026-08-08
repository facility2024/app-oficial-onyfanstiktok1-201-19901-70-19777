import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Loader2, Upload, Image, X } from 'lucide-react';
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
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

  const uploadImage = async (file: File, type: 'logo' | 'banner') => {
    if (!user?.id) {
      toast.error('Você precisa estar logado');
      return;
    }

    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Imagem muito grande. Máximo: ${type === 'logo' ? '2MB' : '5MB'}`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingBanner;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${type}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('store-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('store-assets')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, [`${type}_url`]: publicUrl }));

      if (type === 'logo') {
        setLogoPreview(URL.createObjectURL(file));
      } else {
        setBannerPreview(URL.createObjectURL(file));
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} enviado!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar imagem: ' + (err.message || 'Tente novamente'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (type: 'logo' | 'banner') => {
    setForm(prev => ({ ...prev, [`${type}_url`]: '' }));
    if (type === 'logo') setLogoPreview(null);
    else setBannerPreview(null);
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
    <div className="min-h-screen bg-gray-950 text-white">
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-white/10 backdrop-blur-md shadow-lg"
        style={{
          background: 'linear-gradient(to right, rgba(88, 28, 135, 0.95) 0%, rgba(59, 7, 100, 0.95) 35%, rgba(24, 24, 27, 0.98) 70%, rgba(10, 10, 10, 1) 100%)'
        }}
      >
        <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Store className="w-5 h-5 text-white drop-shadow-md" />
        <h1 className="text-lg font-bold text-white drop-shadow-sm">Criar Minha Loja</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6 p-4 rounded-xl bg-[#C4842E]/10 border border-[#C4842E]/30">
          <p className="text-sm text-[#CD853F]">
            ⚠️ Sua loja será enviada para aprovação. Após aprovada, você poderá adicionar produtos e começar a vender. A comissão é de <strong>30% para o site</strong> e <strong>70% para você</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Nome da Loja *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Minha Loja Incrível"
              required
              className="bg-gray-900 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-gray-300">URL da Loja *</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">/marketplace/loja/</span>
              <Input
                id="slug"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="minha-loja"
                required
                className="bg-gray-900 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva sua loja..."
              rows={3}
              className="bg-gray-900 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <Label className="text-gray-300">Logo da Loja</Label>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, 'logo');
              }}
            />
            {logoPreview || form.logo_url ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-900 border border-white/10">
                <img src={logoPreview || form.logo_url} alt="Logo" className="w-16 h-16 rounded-full object-cover border-2 border-[#7CB342]/40" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{form.logo_url ? 'Logo definido' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => removeImage('logo')}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-white/20 bg-gray-900/50 cursor-pointer hover:border-[#7CB342]/40 hover:bg-gray-900 transition-all"
                onClick={() => logoInputRef.current?.click()}
              >
                {uploadingLogo ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[#7CB342]" />
                ) : (
                  <>
                    <Image className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-400">Clique para enviar o logo</p>
                    <p className="text-xs text-gray-600">JPG, PNG · Máx. 2MB</p>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">ou cole a URL:</span>
              <Input
                value={form.logo_url}
                onChange={e => { setForm(prev => ({ ...prev, logo_url: e.target.value })); setLogoPreview(null); }}
                placeholder="https://..."
                className="bg-gray-900 border-white/10 text-white placeholder:text-gray-500 text-xs h-8"
              />
            </div>
          </div>

          {/* Banner Upload */}
          <div className="space-y-2">
            <Label className="text-gray-300">Banner da Loja</Label>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file, 'banner');
              }}
            />
            {bannerPreview || form.banner_url ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={bannerPreview || form.banner_url} alt="Banner" className="w-full h-32 object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" className="bg-black/50 border-white/30 text-white hover:bg-black/70 backdrop-blur-sm" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                    {uploadingBanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="bg-black/50 border-red-500/30 text-red-400 hover:bg-red-500/20 backdrop-blur-sm" onClick={() => removeImage('banner')}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-white/20 bg-gray-900/50 cursor-pointer hover:border-[#C4842E]/40 hover:bg-gray-900 transition-all"
                onClick={() => bannerInputRef.current?.click()}
              >
                {uploadingBanner ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[#C4842E]" />
                ) : (
                  <>
                    <Image className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-400">Clique para enviar o banner</p>
                    <p className="text-xs text-gray-600">JPG, PNG · Proporção 3:1 · Máx. 5MB</p>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">ou cole a URL:</span>
              <Input
                value={form.banner_url}
                onChange={e => { setForm(prev => ({ ...prev, banner_url: e.target.value })); setBannerPreview(null); }}
                placeholder="https://..."
                className="bg-gray-900 border-white/10 text-white placeholder:text-gray-500 text-xs h-8"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold py-3"
            style={{ background: 'linear-gradient(to right, #7CB342, #558B2F)' }}
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
