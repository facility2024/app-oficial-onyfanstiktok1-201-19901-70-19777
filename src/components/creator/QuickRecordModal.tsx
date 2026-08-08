import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  X,
  Video as VideoIcon,
  RefreshCw,
  Circle,
  Square,
  RotateCcw,
  Send,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

interface QuickRecordModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_SECONDS = 20;

function pickMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}

export function QuickRecordModal({ open, onClose }: QuickRecordModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setErrorMessage('');
    setCameraReady(false);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (err: any) {
      console.error('[QuickRecord] getUserMedia error:', err);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Permissão da câmera negada. Autorize nas configurações do navegador.'
          : 'Não foi possível acessar a câmera.',
      );
    }
  }, [facingMode, stopStream]);

  // Abrir/fechar câmera
  useEffect(() => {
    if (!open) {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    if (!recordedBlob) {
      startCamera();
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode]);

  const startRecording = () => {
    if (!streamRef.current) return;
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
    } catch (e) {
      toast.error('Seu navegador não suporta gravação de vídeo. Atualize e tente novamente.');
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type });
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_SECONDS) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch {}
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const resetTake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    setProgress(0);
    startCamera();
  };

  const handleClose = () => {
    stopRecording();
    stopStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setRecordedBlob(null);
    setPreviewUrl(null);
    setSeconds(0);
    setTitle('');
    setProgress(0);
    setUploading(false);
    onClose();
  };

  const publish = async () => {
    if (!recordedBlob) return;
    setUploading(true);
    setProgress(5);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Você precisa estar autenticado.');

      const finalTitle =
        (title.trim() || `Gravado em ${new Date().toLocaleString('pt-BR')}`).slice(0, 200);

      // 1) Cria vídeo no Bunny + assinatura TUS
      setProgress(10);
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'bunny-video-upload',
        { body: { action: 'create', title: finalTitle } },
      );
      if (createError || !createData?.videoGuid) {
        throw new Error(createError?.message || 'Falha ao preparar upload no servidor');
      }
      const {
        videoGuid,
        libraryId,
        tusEndpoint,
        signature,
        expirationTime,
        videoUrl,
        thumbnailUrl,
      } = createData as any;

      // 2) Upload TUS direto para Bunny
      setProgress(15);
      const file = new File([recordedBlob], `${finalTitle}.${recordedBlob.type.includes('mp4') ? 'mp4' : 'webm'}`, {
        type: recordedBlob.type,
      });
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expirationTime),
            VideoId: videoGuid,
            LibraryId: String(libraryId),
          },
          metadata: {
            filetype: file.type,
            title: finalTitle,
          },
          chunkSize: 25 * 1024 * 1024,
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = 15 + Math.round((bytesUploaded / bytesTotal) * 70);
            setProgress(pct);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      // 3) Inserir na tabela videos (mesmo padrão do Creator Studio)
      setProgress(92);
      const { error: insertError } = await supabase.from('videos').insert({
        title: finalTitle,
        description: '',
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        creator_id: user.id,
        model_id: null,
        visibility: 'public',
        is_featured: false,
        is_active: true,
        duration: '00:00',
        genres: [],
      } as any);
      if (insertError) throw insertError;

      setProgress(100);
      toast.success('Vídeo publicado! 🎉 Já está no seu perfil.');
      handleClose();
    } catch (e: any) {
      console.error('[QuickRecord] publish error:', e);
      toast.error(e?.message || 'Erro ao publicar vídeo');
      setUploading(false);
      setProgress(0);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-gray-800">
        <button
          onClick={handleClose}
          className="text-white p-2 rounded-full hover:bg-gray-800"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-white font-semibold flex items-center gap-2">
          <VideoIcon className="w-4 h-4 text-red-500" />
          Gravar vídeo
        </div>
        {!recordedBlob ? (
          <button
            onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
            disabled={isRecording}
            className="text-white p-2 rounded-full hover:bg-gray-800 disabled:opacity-40"
            aria-label="Trocar câmera"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {!recordedBlob ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            playsInline
            muted
            autoPlay
          />
        ) : (
          <video
            ref={previewRef}
            className="w-full h-full object-contain"
            src={previewUrl || undefined}
            controls
            playsInline
            autoPlay
            loop
          />
        )}

        {/* Timer */}
        {!recordedBlob && cameraReady && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white text-sm px-3 py-1 rounded-full">
            {isRecording && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            {String(seconds).padStart(2, '0')} / {MAX_SECONDS}s
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white bg-black/80">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black border-t border-gray-800 px-4 py-4 space-y-3 pb-safe">
        {recordedBlob ? (
          <>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título (opcional)"
              maxLength={200}
              className="bg-gray-900 border-gray-700 text-white"
              disabled={uploading}
            />

            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-gray-400 text-right">{progress}%</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetTake}
                disabled={uploading}
                className="flex-1 border-gray-700 text-white bg-gray-900 hover:bg-gray-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Regravar
              </Button>
              <Button
                onClick={publish}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!cameraReady}
                className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] disabled:opacity-40"
                aria-label="Iniciar gravação"
              >
                <Circle className="w-8 h-8 text-white fill-white" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-white border-4 border-red-600 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.9)]"
                aria-label="Parar gravação"
              >
                <Square className="w-8 h-8 text-red-600 fill-red-600" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickRecordModal;
