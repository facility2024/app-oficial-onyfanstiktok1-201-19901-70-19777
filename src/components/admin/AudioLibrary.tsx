import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Music, Upload, Trash2, Check, Link as LinkIcon } from 'lucide-react';

interface AudioItem { id: string; name: string; url: string; source: 'url' | 'storage'; path?: string; }

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
  const [urlsText, setUrlsText] = useState('');
  const [savingUrls, setSavingUrls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // URLs salvas
    const { data: urlRows } = await supabase
      .from('audio_library_urls')
      .select('id, name, url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const urlItems: AudioItem[] = (urlRows || []).map(r => ({
      id: r.id, name: r.name, url: r.url, source: 'url',
    }));

    // Storage (uploads antigos)
    const { data: files } = await supabase.storage.from(BUCKET).list(user.id, {
      limit: 100, sortBy: { column: 'created_at', order: 'desc' },
    });
    const paths = (files || []).filter(f => f.name && !f.name.startsWith('.')).map(f => `${user.id}/${f.name}`);
    let storageItems: AudioItem[] = [];
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, ONE_YEAR);
      storageItems = (signed || []).map((s, i) => ({
        id: paths[i], name: paths[i].split('/').pop() || '', url: s.signedUrl, source: 'storage', path: paths[i],
      }));
    }

    setItems([...urlItems, ...storageItems]);
  };

  useEffect(() => { load(); }, []);

  const handleAddUrls = async () => {
    const lines = urlsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) { toast.error('Cole pelo menos uma URL'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Faça login'); return; }
    setSavingUrls(true);
    const rows = lines.map(url => ({
      user_id: user.id,
      url,
      name: decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'audio.mp3'),
    }));
    const { error } = await supabase.from('audio_library_urls').insert(rows);
    setSavingUrls(false);
    if (error) { toast.error('Erro ao salvar URLs'); console.error(error); return; }
    toast.success(`${rows.length} áudio(s) adicionado(s)`);
    setUrlsText('');
    load();
  };

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

  const remove = async (it: AudioItem) => {
    if (!confirm('Remover este áudio?')) return;
    if (it.source === 'url') {
      const { error } = await supabase.from('audio_library_urls').delete().eq('id', it.id);
      if (error) { toast.error('Erro ao remover'); return; }
    } else if (it.path) {
      const { error } = await supabase.storage.from(BUCKET).remove([it.path]);
      if (error) { toast.error('Erro ao remover'); return; }
    }
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
          <p className="text-[11px] text-gray-400 mt-1">Cole URLs (mais leve) ou suba MP3s. Clique em "Usar" para aplicar ao carrossel.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}
            className="h-7 text-xs bg-gray-700 hover:bg-gray-600"
          >
            <Upload className="w-3 h-3 mr-1" /> {uploading ? 'Enviando...' : 'Upload MP3'}
          </Button>
          <input ref={inputRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Adicionar via URLs (leve, sem upload) */}
      <div className="space-y-2 border border-green-700/40 rounded p-2 bg-gray-950/40">
        <Label className="text-xs flex items-center gap-1 text-green-300">
          <LinkIcon className="w-3 h-3" /> Cole URLs MP3 (uma por linha)
        </Label>
        <Textarea
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder={'https://cdn.exemplo.com/musica1.mp3\nhttps://cdn.exemplo.com/musica2.mp3'}
          rows={3}
          className="bg-gray-900 border-gray-700 text-white text-xs placeholder:text-gray-500"
        />
        <Button
          type="button" size="sm" onClick={handleAddUrls} disabled={savingUrls}
          className="h-7 text-xs bg-green-600 hover:bg-green-700 w-full"
        >
          {savingUrls ? 'Salvando...' : 'Adicionar à biblioteca'}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum áudio ainda. Cole URLs acima ou faça upload.</p>
      ) : (
        <div className="max-h-72 overflow-auto space-y-2 pr-1">
          {items.map((it) => {
            const isSelected = selectedUrl === it.url;
            return (
              <div
                key={it.id}
                className={`flex items-center gap-2 rounded p-2 border ${isSelected ? 'border-green-500 bg-green-950/30' : 'border-gray-800 bg-gray-900'}`}
              >
                <audio src={it.url} controls preload="none" className="flex-1 h-8 min-w-0" />
                <span className="text-[10px] text-gray-400 truncate max-w-[120px]" title={it.name}>
                  {it.source === 'url' ? '🔗' : '📁'} {it.name}
                </span>
                <Button
                  type="button" size="sm"
                  onClick={() => { onSelect(it.url); toast.success('Áudio aplicado ao carrossel'); }}
                  className={`h-7 text-xs ${isSelected ? 'bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSelected ? <><Check className="w-3 h-3 mr-1" /> Usando</> : 'Usar'}
                </Button>
                <Button type="button" size="sm" variant="destructive" className="h-7 px-2" onClick={() => remove(it)}>
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
