import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Video, X, CheckCircle, Loader2, FileVideo } from 'lucide-react';

interface BunnyVideoUploaderProps {
  onUploadComplete: (videoUrl: string, thumbnailUrl: string) => void;
  title: string;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

export function BunnyVideoUploader({ onUploadComplete, title }: BunnyVideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file type
    if (!ACCEPTED_FORMATS.includes(selectedFile.type)) {
      toast.error('Formato não suportado. Use MP4, MOV, AVI, MKV ou WebM.');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. O limite é 500MB.');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setUploadComplete(false);
    setUploadProgress(0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const removeFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setUploadComplete(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadToBunny = async () => {
    if (!file) {
      toast.error('Selecione um vídeo primeiro');
      return;
    }

    if (!title || title.trim().length < 3) {
      toast.error('Preencha o título do vídeo antes de fazer upload');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Convert file to base64
      const reader = new FileReader();
      
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:video/mp4;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(30);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('upload-bunny-stream', {
        body: {
          title: title.trim(),
          fileBase64,
          fileName: file.name,
        },
      });

      setUploadProgress(90);

      if (error) {
        throw new Error(error.message || 'Erro ao enviar vídeo');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha no upload');
      }

      setUploadProgress(100);
      setUploadComplete(true);
      
      // Pass URLs back to parent
      onUploadComplete(data.videoUrl, data.thumbnailUrl);
      
      toast.success('Vídeo enviado com sucesso! 🎉', {
        description: 'O processamento pode levar alguns minutos.',
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar vídeo: ' + (error.message || 'Tente novamente'));
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!file && (
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200
            ${dragActive 
              ? 'border-pink-500 bg-pink-500/10' 
              : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
            }
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`p-4 rounded-full ${dragActive ? 'bg-pink-500/20' : 'bg-gray-700'}`}>
              <Upload className={`w-8 h-8 ${dragActive ? 'text-pink-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-white font-medium">
                {dragActive ? 'Solte o vídeo aqui' : 'Arraste seu vídeo aqui ou clique'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                MP4, MOV, AVI, MKV, WebM • Máximo 500MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Preview */}
      {file && preview && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700 rounded-lg">
                <FileVideo className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-white font-medium truncate max-w-[200px]">{file.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={removeFile}
              disabled={uploading}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Video Preview */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={preview}
              controls
              className="w-full h-full object-contain"
            />
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Enviando para Bunny Stream...</span>
                <span className="text-white font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success State */}
          {uploadComplete && (
            <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm">
                Upload concluído! O vídeo está sendo processado.
              </span>
            </div>
          )}

          {/* Upload Button */}
          {!uploadComplete && (
            <Button
              onClick={uploadToBunny}
              disabled={uploading || !title || title.trim().length < 3}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Fazer Upload para Bunny Stream
                </>
              )}
            </Button>
          )}

          {!title || title.trim().length < 3 ? (
            <p className="text-xs text-amber-400 text-center">
              ⚠️ Preencha o título do vídeo acima antes de fazer upload
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
