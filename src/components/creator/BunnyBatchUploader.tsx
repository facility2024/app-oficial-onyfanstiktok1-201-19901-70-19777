import { useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, AlertCircle, X, Video, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Upload em LOTE para o Bunny.net com paralelismo.
 * - Aceita múltiplos vídeos de uma vez
 * - Cria automaticamente a pasta/coleção do criador (via edge function)
 * - Envia 3 vídeos em paralelo via TUS resumable (bem mais rápido)
 * - Insere linha em `videos` assim que cada upload termina (sem esperar encoding)
 */

const CONCURRENCY = 3;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const MAX_FILE_SIZE = 500 * 1024 * 1024;

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';
interface Item {
  id: string;
  file: File;
  progress: number;
  status: ItemStatus;
  error?: string;
}

interface BatchMeta {
  titleBase: string;
  description: string;
  genres: string[];
  visibility: 'public' | 'private';
  is_featured: boolean;
  audio_url?: string | null;
}

interface Props {
  meta: BatchMeta;
  onAllDone?: (successCount: number) => void;
}

export function BunnyBatchUploader({ meta, onAllDone }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const list: Item[] = [];
    Array.from(files).forEach((f) => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: formato não suportado`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: maior que 500MB`);
        return;
      }
      list.push({
        id: `${f.name}-${f.size}-${crypto.randomUUID()}`,
        file: f,
        progress: 0,
        status: 'pending',
      });
    });
    setItems((prev) => [...prev, ...list]);
  };

  const updateItem = (id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const uploadOne = async (item: Item, index: number, userId: string) => {
    updateItem(item.id, { status: 'uploading', progress: 2 });
    const title = `${meta.titleBase} #${index + 1}`;

    // 1) Criar vídeo no Bunny (coleção do criador é criada automaticamente)
    const { data: createData, error: createErr } = await supabase.functions.invoke(
      'bunny-video-upload',
      { body: { action: 'create', title } },
    );
    if (createErr || !createData?.videoGuid) {
      throw new Error(createErr?.message || 'Falha ao criar vídeo no Bunny');
    }
    const { videoGuid, libraryId, tusEndpoint, signature, expirationTime, videoUrl, thumbnailUrl } =
      createData as any;

    // 2) Upload TUS direto para o Bunny
    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(item.file, {
        endpoint: tusEndpoint,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: String(expirationTime),
          VideoId: videoGuid,
          LibraryId: String(libraryId),
        },
        metadata: { filetype: item.file.type, title },
        chunkSize: 50 * 1024 * 1024,
        onError: (err) => reject(err),
        onProgress: (up, total) => {
          const pct = Math.max(2, Math.round((up / total) * 96));
          updateItem(item.id, { progress: pct });
        },
        onSuccess: () => resolve(),
      });
      upload.start();
    });

    // 3) Insere linha em videos (não espera encoding — Bunny processa em background)
    const { error: dbErr } = await supabase.from('videos').insert({
      title,
      description: meta.description,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      audio_url: meta.audio_url || null,
      creator_id: userId,
      model_id: null,
      visibility: meta.visibility,
      is_featured: meta.is_featured,
      is_active: true,
      duration: '00:00',
      genres: meta.genres,
    } as any);
    if (dbErr) throw dbErr;

    updateItem(item.id, { status: 'done', progress: 100 });
  };

  const startBatch = async () => {
    if (items.length === 0) return;
    if (!meta.titleBase || meta.titleBase.trim().length < 3) {
      toast.error('Informe um título base (mín. 3 caracteres)');
      return;
    }
    if (!meta.description || meta.description.trim().length < 10) {
      toast.error('Informe a descrição (mín. 10 caracteres)');
      return;
    }
    if (meta.genres.length === 0) {
      toast.error('Selecione pelo menos um gênero');
      return;
    }

    setRunning(true);
    const { data: { user } } = await supabase.auth.getSession().then((r) => ({
      data: { user: r.data.session?.user },
    }));
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.');
      setRunning(false);
      return;
    }

    const pending = items.filter((i) => i.status === 'pending' || i.status === 'error');
    let cursor = 0;
    let success = 0;
    let fail = 0;

    const worker = async () => {
      while (cursor < pending.length) {
        const idx = cursor++;
        const item = pending[idx];
        try {
          await uploadOne(item, idx, user.id);
          success++;
        } catch (e: any) {
          console.error('[batch] erro:', e?.message || e);
          updateItem(item.id, { status: 'error', error: e?.message || 'Erro no upload' });
          fail++;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => worker()));
    setRunning(false);

    if (success > 0) {
      toast.success(`${success} vídeo(s) publicado(s)!${fail ? ` — ${fail} falharam` : ''}`);
      onAllDone?.(success);
    } else if (fail > 0) {
      toast.error(`Nenhum vídeo enviado. ${fail} falharam.`);
    }
  };

  const clearDone = () => setItems((prev) => prev.filter((i) => i.status !== 'done'));

  const totalProgress =
    items.length > 0
      ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length)
      : 0;

  return (
    <div className="space-y-4">
      <div
        onClick={() => !running && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!running) addFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-purple-500/50 bg-purple-500/5 rounded-xl p-8 text-center cursor-pointer hover:bg-purple-500/10 transition"
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
        <p className="text-white font-semibold">Selecione ou arraste vários vídeos</p>
        <p className="text-sm text-gray-400 mt-1">
          Envio paralelo (3 por vez) — MP4, MOV, WebM ou AVI • até 500MB cada
        </p>
      </div>

      {items.length > 0 && (
        <Card className="p-4 bg-gray-800/50 border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              {items.length} arquivo(s) • {items.filter((i) => i.status === 'done').length} concluído(s)
            </span>
            <div className="flex gap-2">
              {items.some((i) => i.status === 'done') && (
                <Button size="sm" variant="outline" onClick={clearDone} disabled={running}>
                  Limpar concluídos
                </Button>
              )}
              <Button
                size="sm"
                onClick={startBatch}
                disabled={running || items.every((i) => i.status === 'done')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" /> Enviar todos</>
                )}
              </Button>
            </div>
          </div>

          {running && (
            <div className="space-y-1">
              <Progress value={totalProgress} className="h-2" />
              <p className="text-xs text-gray-400 text-right">{totalProgress}% geral</p>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 bg-gray-900/50 rounded-lg p-2">
                <Video className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{i.file.name}</p>
                  <Progress value={i.progress} className="h-1 mt-1" />
                  {i.error && <p className="text-xs text-red-400 mt-1">{i.error}</p>}
                </div>
                {i.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {i.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                {i.status === 'uploading' && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                {i.status === 'pending' && !running && (
                  <button onClick={() => removeItem(i.id)} className="text-gray-400 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
