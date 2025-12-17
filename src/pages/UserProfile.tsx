import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreatorRole } from '@/hooks/useUserRoles';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Save, X, Sparkles, Settings, Share2, Heart, MessageCircle, Users, CheckCircle, Trash2, Crown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { z } from 'zod';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import coconudiLogo from '@/assets/coconudi-logo-white.png';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  username: z.string().min(3, 'Username deve ter no mínimo 3 caracteres').max(30),
  email: z.string().email('Email inválido'),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
});

export default function UserProfile() {
  const { user, profile, loading, updating, updateProfile, uploadAvatar } = useCurrentUser();
  const { isCreator, loading: creatorLoading } = useCreatorRole();
  const { isPremium, getDaysRemaining } = usePremiumStatus();
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
  const [showClearDataAlert, setShowClearDataAlert] = useState(false);
  const [clearingData, setClearingData] = useState(false);

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

  const handleClearAnonymousData = async () => {
    setClearingData(true);
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          if (key.startsWith('follow_') || 
              key === 'anonymous_user_id' ||
              key.startsWith('like_') ||
              key.startsWith('view_')) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🧹 Dados anônimos removidos:', keysToRemove.length, 'itens');
      
      toast.success('Dados anônimos limpos com sucesso!', {
        description: `${keysToRemove.length} itens foram removidos.`
      });
      
      setShowClearDataAlert(false);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast.error('Erro ao limpar dados anônimos');
    } finally {
      setClearingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <p className="text-center text-gray-400 mb-4">
            Você precisa estar logado para ver o perfil
          </p>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="max-w-md bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <p className="text-center text-gray-400">
            Perfil não encontrado
          </p>
          <Button onClick={() => navigate('/app')} className="w-full mt-4">
            Voltar para o App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10" style={{
        background: 'linear-gradient(to right, rgba(0, 245, 212, 0.95) 0%, rgba(0, 229, 204, 0.95) 25%, rgba(191, 234, 124, 0.95) 50%, rgba(254, 228, 64, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)'
      }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/app')}
            className="text-gray-800 hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="text-gray-800 hover:bg-white/20"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Cover Image + Avatar Section */}
        <div className="relative">
          {/* Cover Image */}
          <div 
            className="h-48 md:h-64 relative overflow-hidden"
            style={{
              background: 'linear-gradient(to right, rgba(0, 245, 212, 0.95) 0%, rgba(0, 229, 204, 0.95) 25%, rgba(191, 234, 124, 0.95) 50%, rgba(254, 228, 64, 0.95) 75%, rgba(255, 217, 61, 0.95) 100%)'
            }}
          >
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            
            {/* Logo Banner */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <img 
                src={coconudiLogo}
                alt="CocoNudi"
                className="h-16 md:h-20 lg:h-24 object-contain opacity-80 drop-shadow-lg"
              />
            </motion.div>
          </div>

          {/* Avatar */}
          <motion.div 
            className="absolute -bottom-16 inset-x-0 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 0.5, 
              delay: 0.2,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            <div className="relative">
              <div className="w-32 h-32 rounded-full ring-4 ring-black bg-gray-900 overflow-hidden shadow-xl">
                <img 
                  src={avatarPreview || displayProfile.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.id} 
                  alt={displayProfile.username || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {isEditing && (
                <label className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer hover:opacity-80 transition shadow-lg" style={{
                  background: 'linear-gradient(135deg, rgba(191, 234, 124, 1) 0%, rgba(254, 228, 64, 1) 100%)'
                }}>
                  <Camera className="w-5 h-5 text-gray-800" />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </motion.div>
        </div>

        {/* Profile Info Section */}
        <div className="px-4 md:px-8 pt-20 pb-6">
          {!isEditing ? (
            <>
              {/* Name and Username */}
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {displayProfile.full_name || 'Usuário'}
                    </h1>
                    {isPremium && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        VIP
                      </div>
                    )}
                    {isCreator && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                        <Sparkles className="w-3 h-3" />
                        Criador
                      </div>
                    )}
                  </div>
                  {displayProfile.username && (
                    <p className="text-gray-400">
                      @{displayProfile.username}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Editar Perfil
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-6 pb-6 border-b border-white/10">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-white font-bold text-xl mb-1">
                    <Heart className="w-5 h-5 text-pink-500" />
                    {stats.likes}
                  </div>
                  <p className="text-gray-400 text-sm">Curtidas</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-white font-bold text-xl mb-1">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    {stats.comments}
                  </div>
                  <p className="text-gray-400 text-sm">Comentários</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-white font-bold text-xl mb-1">
                    <Users className="w-5 h-5 text-green-400" />
                    {stats.following}
                  </div>
                  <p className="text-gray-400 text-sm">Seguindo</p>
                </div>
              </div>

              {/* Bio */}
              {displayProfile.bio && (
                <div className="mb-6">
                  <p className="text-gray-300">
                    {displayProfile.bio}
                  </p>
                </div>
              )}

              {/* Member Since */}
              <div className="text-sm text-gray-400 mb-6">
                📅 Membro desde {format(new Date(displayProfile.created_at), 'dd/MM/yyyy')}
              </div>

              {/* Limpar Dados Anônimos */}
              <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">Dados Anônimos</h3>
                    <p className="text-xs text-gray-400">
                      Limpar follows e interações de sessões anteriores
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearDataAlert(true)}
                    className="text-red-400 hover:text-red-300 border-white/10 hover:bg-white/5"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                </div>
              </div>

              {/* Creator Studio Button (if creator) */}
              {isCreator && (
                <Button 
                  onClick={() => navigate('/creator-studio')}
                  className="w-full mb-4 text-white font-semibold"
                  size="lg"
                  style={{
                    background: 'linear-gradient(135deg, rgba(191, 234, 124, 1) 0%, rgba(254, 228, 64, 1) 100%)'
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Acessar Creator Studio
                </Button>
              )}

              {/* Become a Creator Link (if NOT creator) */}
              {!isCreator && !creatorLoading && (
                <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-2">
                    Quer compartilhar seu talento com o mundo?
                  </p>
                  <button
                    onClick={() => navigate('/creator-application')}
                    className="text-green-400 hover:text-green-300 hover:underline text-sm font-medium flex items-center gap-1 justify-center mx-auto"
                  >
                    Torne-se um criador
                    <Sparkles className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Edit Mode */
            <div className="space-y-4 max-w-lg">
              <div>
                <Label className="text-white">Nome Completo</Label>
                <Input 
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="bg-gray-900/50 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Username</Label>
                <Input 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="bg-gray-900/50 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Email</Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  type="email"
                  className="bg-gray-900/50 border-white/10 text-white"
                />
              </div>

              <div>
                <Label className="text-white">Bio</Label>
                <Textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows={3}
                  maxLength={500}
                  className="bg-gray-900/50 border-white/10 text-white"
                />
                <p className="text-gray-400 text-xs mt-1">
                  {formData.bio.length}/500 caracteres
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={updating}
                  className="flex-1 text-white font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(191, 234, 124, 1) 0%, rgba(254, 228, 64, 1) 100%)'
                  }}
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
                  className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear Anonymous Data Alert Dialog */}
      <AlertDialog open={showClearDataAlert} onOpenChange={setShowClearDataAlert}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-black border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">
              Limpar Dados Anônimos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Isso irá remover todos os follows e interações de sessões anônimas anteriores 
              salvas neste dispositivo. Seus dados de usuário autenticado não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearAnonymousData}
              disabled={clearingData}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
            >
              {clearingData ? 'Limpando...' : 'Limpar Dados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
