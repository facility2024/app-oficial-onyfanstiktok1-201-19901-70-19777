import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, Video, Image, ArrowLeft, Loader2, List, BarChart3, Film } from 'lucide-react';
import { z } from 'zod';
import { VideoManagementTable } from '@/components/creator/VideoManagementTable';
import { CreatorStatsPanel } from '@/components/creator/CreatorStatsPanel';
import { useGenres } from '@/hooks/useGenres';

const videoSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(100),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres').max(500),
  video_url: z.string().url('URL do vídeo inválida'),
  thumbnail_url: z.string().url('URL da thumbnail inválida'),
  genres: z.array(z.string()).min(1, 'Selecione pelo menos um gênero'),
});

export default function CreatorStudio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const { genres, loading: genresLoading } = useGenres();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    thumbnail_url: '',
    genres: [] as string[],
  });

  useEffect(() => {
    checkCreatorRole();
  }, []);

  const checkCreatorRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado');
        navigate('/auth');
        return;
      }

      // Verificar se tem role de creator com query SQL direta
      const { data, error } = await supabase
        .rpc('has_role' as any, {
          _user_id: user.id,
          _role: 'creator'
        });

      if (error || !data) {
        toast.error('Você não tem permissão para acessar esta página. Candidate-se como criador primeiro!');
        navigate('/creator-application');
        return;
      }

      setIsCreator(true);
    } catch (error) {
      console.error('Erro ao verificar role:', error);
      toast.error('Erro ao verificar permissões');
      navigate('/');
    } finally {
      setCheckingRole(false);
    }
  };

  const handleToggleGenre = (genreName: string) => {
    setFormData(prev => {
      const currentGenres = prev.genres || [];
      if (currentGenres.includes(genreName)) {
        return { ...prev, genres: currentGenres.filter(g => g !== genreName) };
      } else {
        return { ...prev, genres: [...currentGenres, genreName] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Validar dados
      const validatedData = videoSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Inserir vídeo na tabela videos (usando creator_id)
      const { error: videoError } = await supabase
        .from('videos')
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          video_url: validatedData.video_url,
          thumbnail_url: validatedData.thumbnail_url,
          creator_id: user.id,  // ID do criador autenticado (oculto)
          model_id: null,       // NULL para criadores
          visibility: 'public',
          is_active: true,
          duration: '00:00',
          genres: validatedData.genres,
        } as any);

      if (videoError) throw videoError;

      toast.success('Vídeo publicado com sucesso! 🎉');
      
      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        video_url: '',
        thumbnail_url: '',
        genres: [],
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => toast.error(err.message));
      } else {
        console.error('Erro ao publicar vídeo:', error);
        toast.error('Erro ao publicar vídeo. Tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!isCreator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/app')}
            className="text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">
            Estúdio de Criador
          </h1>
          <p className="text-gray-400">
            Gerencie e publique seus vídeos na plataforma
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border border-gray-700 mb-6">
            <TabsTrigger value="upload" className="data-[state=active]:bg-gray-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-gray-700">
              <List className="w-4 h-4 mr-2" />
              Meus Vídeos
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-gray-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Upload */}
          <TabsContent value="upload">
            <Card className="bg-gray-800/50 border-gray-700 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    Título do Vídeo *
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Meu novo vídeo incrível"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    Descrição *
                  </label>
                  <Textarea
                    placeholder="Descreva seu vídeo..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                    required
                  />
                </div>

                {/* URL do Vídeo */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    <Video className="w-4 h-4 inline mr-2" />
                    URL do Vídeo (Bunny.net) *
                  </label>
                  <Input
                    type="url"
                    placeholder="https://tiktokonyfans.b-cdn.net/..."
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Cole a URL do seu vídeo hospedado no Bunny.net
                  </p>
                </div>

                {/* URL da Thumbnail */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    <Image className="w-4 h-4 inline mr-2" />
                    URL da Thumbnail *
                  </label>
                  <Input
                    type="url"
                    placeholder="https://tiktokonyfans.b-cdn.net/..."
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Cole a URL da imagem de capa do vídeo
                  </p>
                </div>

                {/* Seleção de Gêneros */}
                <div>
                  <label className="text-white font-semibold mb-2 block">
                    <Film className="w-4 h-4 inline mr-2" />
                    Gêneros do Vídeo *
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Selecione os gêneros que melhor descrevem seu vídeo (pode selecionar vários)
                  </p>
                  {genresLoading ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando gêneros...
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {genres
                        .filter(genre => genre.name !== 'Todos')
                        .map((genre) => {
                          const isSelected = formData.genres.includes(genre.name);
                          return (
                            <button
                              key={genre.id}
                              type="button"
                              onClick={() => handleToggleGenre(genre.name)}
                              className={`
                                flex items-center gap-2 p-3 rounded-lg transition-all duration-200
                                ${isSelected 
                                  ? 'bg-gradient-to-r from-pink-500/30 to-purple-600/30 border-2 border-pink-400/50' 
                                  : 'bg-gray-700 border border-gray-600 hover:bg-gray-600'
                                }
                              `}
                            >
                              <Checkbox 
                                checked={isSelected}
                                className="data-[state=checked]:bg-pink-500 data-[state=checked]:border-pink-500"
                              />
                              <span className="text-lg">{genre.icon}</span>
                              <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {genre.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {formData.genres.length > 0 && (
                    <p className="text-xs text-green-400 mt-2">
                      ✓ {formData.genres.length} gênero(s) selecionado(s): {formData.genres.join(', ')}
                    </p>
                  )}
                </div>

                {/* Preview */}
                {formData.video_url && formData.thumbnail_url && (
                  <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Vídeo:</p>
                        <video
                          src={formData.video_url}
                          controls
                          className="w-full rounded-lg"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Thumbnail:</p>
                        <img
                          src={formData.thumbnail_url}
                          alt="Preview"
                          className="w-full rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Publicar Vídeo
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Instruções */}
            <Card className="mt-6 bg-blue-500/10 border-blue-500/30 p-4">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Video className="w-4 h-4 mr-2" />
                Como usar o Bunny.net
              </h3>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Faça upload do seu vídeo no Bunny.net</li>
                <li>Faça upload da thumbnail (imagem de capa)</li>
                <li>Copie as URLs públicas geradas</li>
                <li>Cole as URLs nos campos acima</li>
                <li>Clique em "Publicar Vídeo"</li>
              </ol>
            </Card>
          </TabsContent>

          {/* Tab: Gerenciar Vídeos */}
          <TabsContent value="manage">
            <VideoManagementTable />
          </TabsContent>

          {/* Tab: Estatísticas */}
          <TabsContent value="stats">
            <CreatorStatsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
