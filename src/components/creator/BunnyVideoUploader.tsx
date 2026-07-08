import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

// 🔐 SEGURANÇA: a chave do Bunny.net não vive mais no bundle do client.
// A edge function `bunny-video-upload` cria o vídeo no Bunny e devolve uma
// assinatura TUS de uso único (expira em 1h). O upload resumable acontece
// direto do navegador para o Bunny usando essa assinatura — a chave nunca
// é exposta ao client.
const BUNNY_CDN_HOSTNAME = 'vz-2342b018-2d3.b-cdn.net'; // público (aparece nas URLs do CDN)

interface BunnyVideoUploaderProps {
  onUploadComplete: (videoUrl: string, thumbnailUrl: string) => void;
  onUploadStart?: () => void;
}

export function BunnyVideoUploader({ onUploadComplete, onUploadStart }: BunnyVideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato de vídeo não suportado. Use MP4, MOV, WebM ou AVI.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. O limite é 500MB.');
      return false;
    }
    return true;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadStatus('uploading');
    setProgress(5);
    onUploadStart?.();

    try {
      // Step 1: pedir à edge function que crie o vídeo no Bunny e devolva a assinatura TUS
      setProgress(10);
      const title = selectedFile.name.replace(/\.[^/.]+$/, '');
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'bunny-video-upload',
        { body: { action: 'create', title } },
      );

      if (createError || !createData?.videoGuid) {
        throw new Error(createError?.message || 'Falha ao criar vídeo no servidor');
      }

      const {
        videoGuid,
        libraryId,
        tusEndpoint,
        signature,
        expirationTime,
        videoUrl,
        thumbnailUrl,
      } = createData as {
        videoGuid: string;
        libraryId: string;
        tusEndpoint: string;
        signature: string;
        expirationTime: number;
        videoUrl: string;
        thumbnailUrl: string;
      };

      setProgress(15);

      // Step 2: upload resumable via TUS direto para o Bunny (sem chave no client)
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(selectedFile, {
          endpoint: tusEndpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: signature,
            AuthorizationExpire: String(expirationTime),
            VideoId: videoGuid,
            LibraryId: String(libraryId),
          },
          metadata: {
            filetype: selectedFile.type,
            title,
          },
          chunkSize: 50 * 1024 * 1024, // 50MB
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = 15 + Math.round((bytesUploaded / bytesTotal) * 55); // 15% -> 70%
            setProgress(pct);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setProgress(100);
      setUploadStatus('success');
      toast.success('Vídeo enviado! Já está no painel — o Bunny finaliza o processamento em segundo plano. 🎉');

      // Devolve as URLs imediatamente para o painel do criador. O playlist.m3u8
      // e a thumbnail.jpg ficam válidos assim que o Bunny termina o encoding
      // (poucos segundos após o upload) — não bloqueamos a UI esperando.
      onUploadComplete(videoUrl, thumbnailUrl);

      // Verificação opcional em segundo plano — apenas informa quando pronto.
      (async () => {
        for (let i = 0; i < 24; i++) {
          try {
            const head = await fetch(videoUrl, { method: 'HEAD', cache: 'no-store' });
            if (head.ok) {
              toast.success('Vídeo transcodificado e disponível no CDN!');
              return;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 5000));
        }
      })();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setUploadStatus('error');
      const msg = error?.message || 'Erro ao fazer upload';
      setErrorMessage(msg);
      toast.error('Erro ao fazer upload: ' + msg);
    } finally {
      setUploading(false);
    }
  };

  const resetUploader = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setProgress(0);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-green-400 bg-green-500/10'
            : selectedFile
              ? 'border-gray-600 bg-gray-800/50'
              : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">
              Arraste seu vídeo aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-400">
              MP4, MOV, WebM ou AVI • Máximo 500MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              {uploadStatus !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetUploader();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {uploadStatus === 'uploading' && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando para Bunny.net...
                  </span>
                  <span className="text-white">{progress}%</span>
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Upload concluído! URLs preenchidas automaticamente.</span>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFile && uploadStatus !== 'success' && (
        <Button
          onClick={uploadVideo}
          disabled={uploading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar para Bunny.net
            </>
          )}
        </Button>
      )}

      {uploadStatus === 'success' && (
        <Button
          variant="outline"
          onClick={resetUploader}
          className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Enviar outro vídeo
        </Button>
      )}
    </div>
  );
}
