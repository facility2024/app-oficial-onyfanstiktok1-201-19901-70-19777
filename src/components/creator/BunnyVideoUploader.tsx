import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Bunny.net credentials - Direct upload
const BUNNY_LIBRARY_ID = '558340';
const BUNNY_API_KEY = '3be9e550-5641-40ea-ba4696767be3-755b-449f';
const BUNNY_CDN_HOSTNAME = 'vz-2342b018-2d3.b-cdn.net';

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
    setProgress(10);
    onUploadStart?.();

    try {
      // Step 1: Create video object in Bunny Stream
      setProgress(15);
      const createResponse = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: selectedFile.name.replace(/\.[^/.]+$/, '')
          })
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Erro ao criar vídeo: ${errorText}`);
      }

      const videoData = await createResponse.json();
      const videoGuid = videoData.guid;

      if (!videoGuid) {
        throw new Error('GUID do vídeo não retornado pela Bunny');
      }

      setProgress(30);

      // Step 2: Upload the video file directly to Bunny
      const uploadResponse = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoGuid}`,
        {
          method: 'PUT',
          headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/octet-stream'
          },
          body: selectedFile
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Erro no upload: ${errorText}`);
      }

      setProgress(70);

      // Poll Bunny API to check encoding status before confirming
      const videoUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/play_720p.mp4`;
      const thumbnailUrl = `https://${BUNNY_CDN_HOSTNAME}/${videoGuid}/thumbnail.jpg`;

      toast.info('Vídeo enviado! Aguardando processamento no servidor...', { duration: 5000 });

      // Poll encoding status (up to 2 minutes)
      let encoded = false;
      for (let i = 0; i < 24; i++) {
        setProgress(70 + Math.min(i * 1.2, 28));
        try {
          const statusRes = await fetch(
            `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${videoGuid}`,
            { headers: { 'AccessKey': BUNNY_API_KEY, 'Accept': 'application/json' } }
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            // status: 0=created, 1=uploaded, 2=processing, 3=transcoding, 4=finished, 5=error
            console.log(`🔄 Bunny encoding status: ${statusData.status} (attempt ${i + 1})`);
            if (statusData.status >= 4) {
              encoded = true;
              break;
            }
            if (statusData.status === 5) {
              throw new Error('Erro no processamento do vídeo pelo Bunny.net');
            }
          }
        } catch (pollErr: any) {
          if (pollErr.message?.includes('Erro no processamento')) throw pollErr;
          console.warn('Poll error:', pollErr);
        }
        await new Promise(r => setTimeout(r, 5000)); // wait 5s between polls
      }

      setProgress(100);
      setUploadStatus('success');

      if (encoded) {
        toast.success('Vídeo processado e pronto para exibição! 🎉');
      } else {
        toast.warning('Vídeo enviado, mas ainda está sendo processado. Pode levar alguns minutos para aparecer no feed.', { duration: 8000 });
      }
      
      // Pass URLs to parent
      onUploadComplete(videoUrl, thumbnailUrl);

    } catch (error: any) {
      console.error('Erro no upload:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Erro ao fazer upload');
      toast.error('Erro ao fazer upload: ' + error.message);
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
      {/* Drop Zone */}
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
            {/* File Info */}
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

            {/* Progress Bar */}
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

            {/* Success State */}
            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Upload concluído! URLs preenchidas automaticamente.</span>
              </div>
            )}

            {/* Error State */}
            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Button */}
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

      {/* Upload Another */}
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
