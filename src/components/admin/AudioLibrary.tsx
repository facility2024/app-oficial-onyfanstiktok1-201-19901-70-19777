import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Music, Upload, Trash2, Check } from 'lucide-react';

interface AudioItem { name: string; path: string; signedUrl: string; }

const BUCKET = 'carousel-audios';
const ONE_YEAR = 60 * 60 * 24 * 365;

export const AudioLibrary = ({
  selectedUrl,
  onSelect,
}: {
  selectedUrl?: string;
  onSelect: (url: string) => void;
}) => {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error) { console.error(error); return; }
    const paths = (data || []).filter(f => f.name && !f.name.startsWith('.')).map(f => `${user.id}/${f.name}`);
    if (paths.length === 0) { setItems([]); return; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, ONE_YEAR);
    setItems((signed || []).map((s, i) => ({
      name: paths[i].split('/').pop() || '',
      path: paths[i],
      signedUrl: s.signedUrl,
    })));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login'); return; }
    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('audio/')) { fail++; continue; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'audio/mpeg',
      });
      if (error) { console.error(error); fail++; } else ok++;
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    toast[ok ? 'success' : 'error'](`${ok} áudio(s) enviado(s)${fail ? `, ${fail} falharam` : ''}`);
    load();
  };

  const remove = async (path: string) => {
    if (!confirm('Remover este áudio?')) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) { toast.error('Erro ao remover'); return; }
    toast.success('Removido');
    load();
  };

  return (
    <div className="space-y-3 border-2 border-green-500/60 rounded-lg p-4 bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="flex items-center gap-2 text-base font-bold text-green-400">
            <Music className="w-5 h-5" /> 🎵 Biblioteca de Áudios MP3
          </Label>
          <p className="text-[11px] text-gray-400 mt-1">Suba vários MP3s, escute a prévia e clique em "Usar" para aplicar ao carrossel.</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="h-7 text-xs bg-green-600 hover:bg-green-700"
        >
          <Upload className="w-3 h-3 mr-1" /> {uploading ? 'Enviando...' : 'Subir MP3s'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum áudio. Envie vários MP3s e clique em "Usar" para aplicar ao carrossel.</p>
      ) : (
        <div className="max-h-72 overflow-auto space-y-2 pr-1">
          {items.map((it) => {
            const isSelected = selectedUrl === it.signedUrl;
            return (
              <div
                key={it.path}
                className={`flex items-center gap-2 rounded p-2 border ${isSelected ? 'border-green-500 bg-green-950/30' : 'border-gray-800 bg-gray-900'}`}
              >
                <audio src={it.signedUrl} controls preload="none" className="flex-1 h-8 min-w-0" />
                <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{it.name}</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { onSelect(it.signedUrl); toast.success('Áudio aplicado ao carrossel'); }}
                  className={`h-7 text-xs ${isSelected ? 'bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSelected ? <><Check className="w-3 h-3 mr-1" /> Usando</> : 'Usar'}
                </Button>
                <Button type="button" size="sm" variant="destructive" className="h-7 px-2" onClick={() => remove(it.path)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
