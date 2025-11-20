import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, Save, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres').max(30),
  email: z.string().email('Email inválido'),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
});

export default function UserProfile() {
  const { user, profile, loading, updating, updateProfile, uploadAvatar } = useCurrentUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    bio: '',
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stats, setStats] = useState({
    likes: 0,
    comments: 0,
    following: 0,
  });

  useEffect(() => {
    if (profile || user) {
      const currentProfile = profile || (user ? {
        full_name: user.email?.split('@')[0] || '',
        username: user.email?.split('@')[0] || '',
        email: user.email || '',
        bio: '',
      } : null);
      
      if (currentProfile) {
        setFormData({
          full_name: currentProfile.full_name || '',
          username: currentProfile.username || '',
          email: currentProfile.email || '',
          bio: currentProfile.bio || '',
        });
      }
    }
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    const { count: likesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: commentsCount } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: followingCount } = await supabase
      .from('model_followers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);

    setStats({
      likes: likesCount || 0,
      comments: commentsCount || 0,
      following: followingCount || 0,
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      profileSchema.parse(formData);

      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      await updateProfile(formData);

      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Erro ao atualizar perfil');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md bg-background border-border">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              Você precisa estar logado para ver o perfil
            </p>
            <Button onClick={() => navigate('/auth')} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se tiver usuário mas não tiver perfil, criar perfil básico temporário
  const displayProfile = profile || (user ? {
    id: user.id,
    user_id: user.id,
    email: user.email || '',
    username: user.email?.split('@')[0] || 'Usuário',
    full_name: user.email?.split('@')[0] || 'Usuário',
    avatar_url: null,
    bio: null,
    created_at: new Date().toISOString()
  } : null);

  if (!displayProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="max-w-md bg-background border-border">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Perfil não encontrado
            </p>
            <Button onClick={() => navigate('/app')} className="w-full mt-4">
              Voltar para o App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/app')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-xl font-bold text-white">
            Perfil do Usuário
          </h1>
          
          <div className="w-20"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Avatar e Info Principal */}
        <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 border-white/10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <div className="relative">
                <img 
                  src={avatarPreview || displayProfile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.id} 
                  alt={displayProfile.username || 'User'}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white/20"
                />
                
                {isEditing && (
                  <label className="absolute bottom-0 right-0 bg-primary p-2 rounded-full cursor-pointer hover:bg-primary/80 transition">
                    <Camera className="w-5 h-5 text-white" />
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Info */}
              {!isEditing ? (
                <div className="text-center space-y-2 w-full">
                  <h2 className="text-2xl font-bold text-white">
                    {displayProfile.full_name || 'Usuário'}
                  </h2>
                  {displayProfile.username && (
                    <p className="text-white/60">
                      @{displayProfile.username}
                    </p>
                  )}
                  <p className="text-white/40 text-sm">
                    {displayProfile.email}
                  </p>
                  {displayProfile.bio && (
                    <p className="text-white/80 text-sm max-w-md mx-auto">
                      {displayProfile.bio}
                    </p>
                  )}
                  
                  <div className="flex gap-4 justify-center pt-4">
                    <div className="text-center">
                      <p className="text-white/40 text-xs">Membro desde</p>
                      <p className="text-white font-semibold">
                        {format(new Date(displayProfile.created_at), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="mt-4"
                  >
                    Editar Perfil
                  </Button>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  <div>
                    <Label className="text-white">Nome Completo</Label>
                    <Input 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Username</Label>
                    <Input 
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Email</Label>
                    <Input 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      type="email"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Bio</Label>
                    <Textarea 
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      className="bg-white/10 border-white/20 text-white"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-white/40 text-xs mt-1">
                      {formData.bio.length}/500 caracteres
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave}
                      disabled={updating}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updating ? 'Salvando...' : 'Salvar'}
                    </Button>
                    
                    <Button 
                      onClick={() => {
                        setIsEditing(false);
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                      variant="outline"
                      className="flex-1 text-white border-white/20 hover:bg-white/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card Torne-se Criador */}
        <Card className="!bg-gradient-to-r !from-pink-900/80 !to-purple-900/80 border-pink-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Torne-se um Criador de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-white/80 text-sm">
              Compartilhe seu talento e ganhe dinheiro com seus vídeos. 
              Junte-se à nossa comunidade de criadores!
            </p>
            <Button 
              onClick={() => navigate('/creator-application')}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Cadastrar Agora
            </Button>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.likes}</p>
                <p className="text-white/60 text-sm">Curtidas</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.comments}</p>
                <p className="text-white/60 text-sm">Comentários</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.following}</p>
                <p className="text-white/60 text-sm">Seguindo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
