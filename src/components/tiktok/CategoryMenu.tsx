import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Phone, Users, ShoppingBag, MapPin, BookmarkPlus, Sparkles, LogOut, Bot, Crown, Radio } from "lucide-react";
import { useState } from "react";
import coconutIcon from "@/assets/coconudi-logo-new.png";
import { UserMenuHeader } from "./UserMenuHeader";
import { useNavigate } from "react-router-dom";

import { AdCarousel } from "./AdCarousel";
import { ModelCarousel } from "./ModelCarousel";
import { MarketplaceCarousel } from "./MarketplaceCarousel";
import { LocalBusinessCarousel } from "./LocalBusinessCarousel";
import { GenreSelector } from "./GenreSelector";
import { MARKETPLACE_GENRES } from '@/constants/marketplaceGenres';
import { useCreatorRole } from '@/hooks/useUserRoles';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface MenuItemProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface CategoryMenuProps {
  onOpenLive?: () => void;
  onExit?: () => void;
  onSelectModel?: (modelId: string) => void;
}

export const CategoryMenu = ({ 
  onOpenLive,
  onExit,
  onSelectModel
}: CategoryMenuProps) => {
  const [open, setOpen] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const navigate = useNavigate();
  const { isCreator, loading: creatorLoading } = useCreatorRole();
  const { isPremium } = usePremiumStatus();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setShowLogoutAlert(false);
      setOpen(false);
      toast.success('Você saiu da conta com sucesso!');
      navigate('/auth');
    } catch (error) {
      console.error('Erro ao sair:', error);
      toast.error('Erro ao sair da conta');
    }
  };

  // Construir menuItems dinamicamente
  const baseMenuItems: MenuItemProps[] = [
    {
      id: "video-chamada",
      name: "Vídeo Chamada",
      icon: (
        <span className="relative inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
          <Phone className="w-5 h-5 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-[vibrate_0.3s_linear_infinite]" strokeWidth={1.5} />
        </span>
      ),
      onClick: () => {
        onOpenLive?.();
        setOpen(false);
      }
    },
    {
      id: "live",
      name: "Live",
      icon: (
        <span className="relative inline-flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
          <Radio className="w-5 h-5 text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)] animate-[vibrate_0.3s_linear_infinite]" strokeWidth={1.5} />
        </span>
      ),
      onClick: () => {
        setOpen(false);
        toast.info('🔴 Em breve! Acesse o perfil da modelo para ver se está ao vivo.');
      }
    },
    {
      id: "following",
      name: "Seguindo",
      icon: <Users className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        window.location.href = '/following';
      }
    },
    {
      id: "marketplace",
      name: "Market-Place",
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/marketplace'), 100);
      }
    },
    {
      id: "local-business",
      name: "Negócios Locais",
      icon: <MapPin className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/local-business'), 100);
      }
    },
    {
      id: "collections",
      name: "Coleções",
      icon: <BookmarkPlus className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/collections'), 100);
      }
    },
    {
      id: "following-creators",
      name: "Criadores Seguidos",
      icon: <Sparkles className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/following-creators'), 100);
      }
    },
    {
      id: "chat-ai",
      name: "Chat IA",
      icon: <Bot className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/ChatIA'), 100);
      }
    }
  ];

  // Adicionar opção de Minhas Assinaturas (sempre visível)
  baseMenuItems.push({
    id: "my-subscriptions",
    name: "Minhas Assinaturas",
    icon: <Crown className="w-5 h-5 text-amber-400" />,
    onClick: () => {
      setOpen(false);
      setTimeout(() => navigate('/my-subscriptions'), 100);
    }
  });

  // Adicionar "Seja VIP" apenas se NÃO for premium
  if (!isPremium) {
    baseMenuItems.push({
      id: "subscribe",
      name: "Seja VIP",
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      onClick: () => {
        setOpen(false);
        setTimeout(() => navigate('/subscribe'), 100);
      }
    });
  }

  // Adicionar "Sou Criador" apenas se isCreator === true E não está carregando
  if (isCreator === true && creatorLoading === false) {
    baseMenuItems.push({
      id: "creator",
      name: "Sou Criador",
      icon: <Sparkles className="w-5 h-5" />,
      onClick: () => {
        setOpen(false);
        requestAnimationFrame(() => {
          navigate('/creator-studio');
        });
      }
    });
  }

  // Adicionar "Sair" no final
  baseMenuItems.push({
    id: "exit",
    name: "Sair",
    icon: <LogOut className="w-5 h-5" />,
    onClick: () => {
      setShowLogoutAlert(true);
    }
  });

  const menuItems = baseMenuItems;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
        <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-black/95 backdrop-blur-xl border-r border-white/10 p-0 flex flex-col">
        {/* Header Fixo */}
        <div className="flex-shrink-0">
          <SheetHeader className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
                <img 
                  src={coconutIcon} 
                  alt="Coconudi" 
                  className="w-full h-full object-cover"
                />
              </div>
              <SheetTitle className="text-white text-2xl font-bold tracking-tight">
                coconudi
              </SheetTitle>
            </div>
          </SheetHeader>
          
          {/* Header do Usuário */}
          <UserMenuHeader />
        </div>
        
        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-6">
          {/* Seções de Destaque, Patrocinado e Modelos */}
          <div className="py-4 space-y-4 px-4">
            
            {/* Patrocinado */}
            <AdCarousel location="feed" />
            
            {/* Novas Modelos */}
            <ModelCarousel 
              title="Novas Modelos" 
              icon="✨"
              direction="ltr"
              carouselIndex={1}
              onSelectModel={(modelId) => {
                onSelectModel?.(modelId);
                setOpen(false);
              }}
            />
            
            {/* Top Avaliados - Marketplace */}
            <MarketplaceCarousel />
            
            {/* Top 10 Comércios Locais */}
            <LocalBusinessCarousel />
          </div>

          {/* Seletor de Gênero */}
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-xs text-gray-400 mb-2 px-2">Filtrar por Gênero</p>
            <GenreSelector 
              onGenreSelect={(genre) => {
                setOpen(false);
                if (genre && genre !== 'Todos') {
                  setTimeout(() => navigate(`/marketplace?genre=${encodeURIComponent(genre)}`), 150);
                }
              }} 
              showLabel={true}
            />
          </div>

          {/* Gêneros do Marketplace */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-gray-400 mb-2 px-2">📂 Categorias Marketplace</p>
            <div className="grid grid-cols-2 gap-2 px-2">
              {MARKETPLACE_GENRES.map((genre) => (
                <button
                  key={genre.name}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/marketplace?genre=${encodeURIComponent(genre.name)}`);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/15 transition-colors text-sm text-white/80"
                >
                  <span className="text-base">{genre.icon}</span>
                  <span className="truncate">{genre.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Menu de Navegação */}
          <div className="pb-24">
            <div className="space-y-1">
              {menuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start px-6 py-3 text-white hover:bg-white/10 rounded-none cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.id !== 'exit') {
                        e.stopPropagation();
                      }
                      item.onClick();
                    }}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.name}</span>
                  </Button>
                ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* AlertDialog de Logout - Tema Escuro Moderno */}
      <AlertDialog open={showLogoutAlert} onOpenChange={setShowLogoutAlert}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-black border border-white/10 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-400" />
              Sair da conta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
