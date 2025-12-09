import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Upload, Video, X, CheckCircle, Loader2, FileVideo, Pause, Play } from 'lucide-react';
import * as tus from 'tus-js-client';

interface BunnyVideoUploaderProps {
  onUploadComplete: (videoUrl: string, thumbnailUrl: string) => void;
  title: string;
}

const ACCEPTED_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

export function BunnyVideoUploader({ onUploadComplete, title }: BunnyVideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tusUploadRef = useRef<tus.Upload | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_FORMATS.includes(selectedFile.type)) {
      toast.error('Formato não suportado. Use MP4, MOV, AVI, MKV ou WebM.');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setUploadComplete(false);
    setUploadProgress(0);
    setIsPaused(false);
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
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setUploadComplete(false);
    setUploadProgress(0);
    setIsPaused(false);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePause = () => {
    if (tusUploadRef.current) {
      if (isPaused) {
        tusUploadRef.current.start();
      } else {
        tusUploadRef.current.abort();
      }
      setIsPaused(!isPaused);
    }
  };

  // Helper: Fetch with retry and longer timeout (30s)
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[TUS Upload] Fetch attempt ${i + 1}/${retries}...`);
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch (error: any) {
        console.error(`[TUS Upload] Fetch attempt ${i + 1} failed:`, error);
        if (error.name === 'AbortError') {
          clearTimeout(timeout);
          throw new Error('Timeout: servidor demorou muito para responder (30s)');
        }
        if (i === retries - 1) {
          clearTimeout(timeout);
          throw error;
        }
        const delay = 2000 * (i + 1); // Longer delays: 2s, 4s, 6s
        console.log(`[TUS Upload] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
    clearTimeout(timeout);
    throw new Error('Todas as tentativas falharam');
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
    setUploadProgress(0);

    try {
      console.log('[TUS Upload] ===== STARTING UPLOAD =====');
      console.log('[TUS Upload] File:', file.name, 'Size:', file.size, 'Type:', file.type);
      console.log('[TUS Upload] Title:', title.trim());
      
      // Step 0: Verify user session
      console.log('[TUS Upload] Step 0: Checking user session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      console.log('[TUS Upload] Session valid, user:', session.user.email);
      
      // Step 1: Create video object in Bunny using DIRECT FETCH
      console.log('[TUS Upload] Step 1: Calling Edge Function via direct fetch...');
      
      const functionUrl = 'https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/bunny-upload';
      
      let response: Response;
      try {
        response = await fetchWithRetry(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ title: title.trim() })
        });
        
        console.log('[TUS Upload] Response status:', response.status);
        console.log('[TUS Upload] Response headers:', Object.fromEntries(response.headers.entries()));
        
      } catch (fetchError: any) {
        console.error('[TUS Upload] Fetch completely failed:', fetchError);
        throw new Error(`Falha de conexão: ${fetchError.message}. Verifique sua internet ou se a Edge Function está deployada.`);
      }

      // Parse response
      const responseText = await response.text();
      console.log('[TUS Upload] Response body:', responseText);

      if (!response.ok) {
        console.error('[TUS Upload] HTTP Error:', response.status, responseText);
        throw new Error(`Erro ${response.status}: ${responseText || 'Erro desconhecido no servidor'}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[TUS Upload] Failed to parse JSON:', parseError);
        throw new Error('Resposta inválida do servidor. Resposta: ' + responseText.substring(0, 200));
      }

      if (!data.success) {
        console.error('[TUS Upload] API returned error:', data);
        throw new Error(data?.error || 'Falha ao criar vídeo no Bunny');
      }

      console.log('[TUS Upload] Video object created successfully!');
      console.log('[TUS Upload] Video ID:', data.videoId);
      console.log('[TUS Upload] Library ID:', data.libraryId);
      console.log('[TUS Upload] TUS Endpoint:', data.tusEndpoint);
      console.log('[TUS Upload] Step 2: Starting TUS upload...');

      // Step 2: Upload file directly to Bunny via TUS protocol
      const upload = new tus.Upload(file, {
        endpoint: data.tusEndpoint,
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        headers: {
          'AuthorizationSignature': data.authorizationSignature,
          'AuthorizationExpire': data.expirationTime.toString(),
          'VideoId': data.videoId,
          'LibraryId': data.libraryId,
        },
        onError: (error) => {
          console.error('[TUS Upload] Upload failed:', error);
          toast.error('Erro no upload: ' + error.message);
          setUploading(false);
          setUploadProgress(0);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
          setUploadProgress(percentage);
          console.log(`[TUS Upload] Progress: ${percentage}% (${bytesUploaded}/${bytesTotal})`);
        },
        onSuccess: () => {
          console.log('[TUS Upload] Upload completed successfully!');
          setUploadProgress(100);
          setUploadComplete(true);
          setUploading(false);
          
          onUploadComplete(data.videoUrl, data.thumbnailUrl);
          
          toast.success('Vídeo enviado com sucesso! 🎉', {
            description: 'O processamento pode levar alguns minutos.',
          });
        },
      });

      // Store reference for pause/resume
      tusUploadRef.current = upload;

      // Check for previous upload to resume
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length > 0) {
        console.log('[TUS Upload] Resuming previous upload...');
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }

      // Start upload
      upload.start();

    } catch (error: any) {
      console.error('[TUS Upload] Error:', error);
      toast.error('Erro ao enviar vídeo: ' + (error.message || 'Tente novamente'));
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
                MP4, MOV, AVI, MKV, WebM • Sem limite de tamanho
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
              disabled={uploading && !isPaused}
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
                <span className="text-gray-400">
                  {isPaused ? 'Upload pausado' : 'Enviando via TUS Protocol...'}
                </span>
                <span className="text-white font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              
              {/* Pause/Resume Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
                className="w-full"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Retomar Upload
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar Upload
                  </>
                )}
              </Button>
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
          {!uploadComplete && !uploading && (
            <Button
              onClick={uploadToBunny}
              disabled={!title || title.trim().length < 3}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Video className="w-4 h-4 mr-2" />
              Fazer Upload para Bunny Stream
            </Button>
          )}

          {uploading && !isPaused && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Upload resumível - pode fechar e retomar depois
            </div>
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
