import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Music, Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';

interface AudioUploaderProps {
  value?: string;
  onChange: (audioUrl: string) => void;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export function AudioUploader({ value, onChange }: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.mp3')) {
      toast.error('Envie um arquivo de áudio (MP3).');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Áudio muito grande (máx. 20MB).');
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Faça login para enviar áudio.');
      const ext = file.name.split('.').pop() || 'mp3';
      const path = `creator-audios/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('store-assets')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'audio/mpeg' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('store-assets').getPublicUrl(path);
      onChange(pub.publicUrl);
      toast.success('Áudio enviado!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar áudio: ' + (err?.message || ''));
    } finally {
      setUploading(false);
    }
  };

  const handleLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Cole um link válido (http/https).');
      return;
    }
    onChange(url);
    setLinkInput('');
    toast.success('Link de áudio aplicado.');
  };

  const clear = () => onChange('');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-white font-semibold">
        <Music className="w-4 h-4" />
        Áudio de fundo (opcional) — MP3
      </div>
      <p className="text-xs text-gray-400 -mt-1">
        Se enviado, este áudio tocará por cima do vídeo/imagem (o som original do vídeo será silenciado).
      </p>

      {value ? (
        <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-green-400 truncate">🎵 Áudio aplicado</span>
            <Button type="button" size="sm" variant="ghost" onClick={clear} className="text-red-300 hover:text-red-400 h-7 px-2">
              <X className="w-4 h-4 mr-1" /> Remover
            </Button>
          </div>
          <audio src={value} controls className="w-full h-10" />
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="bg-gray-700 border border-gray-600">
            <TabsTrigger value="upload"><Upload className="w-3 h-3 mr-1" /> Upload MP3</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="w-3 h-3 mr-1" /> Colar link MP3</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,.mp3"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</> : <><Upload className="w-4 h-4 mr-2" /> Selecionar arquivo MP3</>}
            </Button>
            <p className="text-xs text-gray-400 mt-2">Máx. 20MB.</p>
          </TabsContent>
          <TabsContent value="link" className="mt-3 space-y-2">
            <Input
              type="url"
              placeholder="https://.../audio.mp3"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button type="button" onClick={handleLink} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              Aplicar link
            </Button>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
