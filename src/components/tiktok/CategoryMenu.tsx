import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Video, Users, ShoppingBag, MapPin, BookmarkPlus, CreditCard, Sparkles, LogOut } from "lucide-react";
import { useState } from "react";
import coconutIcon from "@/assets/coconut-icon.png";
import { UserMenuHeader } from "./UserMenuHeader";
import { useNavigate } from "react-router-dom";
import { FeaturedSection } from "./FeaturedSection";
import { AdCarousel } from "./AdCarousel";
import { ModelCarousel } from "./ModelCarousel";

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
  const navigate = useNavigate();

  const menuItems: MenuItemProps[] = [
    {
      id: "live",
      name: "Live",
      icon: <Video className="w-5 h-5" />,
      onClick: () => {
        onOpenLive?.();
        setOpen(false);
      }
    },
    {
      id: "following",
      name: "Seguindo",
      icon: <Users className="w-5 h-5" />,
      onClick: () => {
        console.log('👥 SEGUINDO: Botão do menu clicado');
        setOpen(false);
        window.location.href = '/following';
      }
    },
    {
      id: "marketplace",
      name: "Market-Place",
      icon: <ShoppingBag className="w-5 h-5" />,
      onClick: () => {
        console.log('🛍️ Navegando para Marketplace');
        setOpen(false);
        setTimeout(() => navigate('/marketplace'), 100);
      }
    },
    {
      id: "local-business",
      name: "Negócios Locais",
      icon: <MapPin className="w-5 h-5" />,
      onClick: () => {
        console.log('📍 Navegando para Negócios Locais');
        setOpen(false);
        setTimeout(() => navigate('/local-business'), 100);
      }
    },
    {
      id: "collections",
      name: "Coleções",
      icon: <BookmarkPlus className="w-5 h-5" />,
      onClick: () => {
        console.log('📚 Navegando para Coleções');
        setOpen(false);
        setTimeout(() => navigate('/collections'), 100);
      }
    },
    {
      id: "subscriptions",
      name: "Assinaturas",
      icon: <CreditCard className="w-5 h-5" />,
      onClick: () => {
        console.log('💳 Navegando para Assinaturas');
        setOpen(false);
        setTimeout(() => navigate('/subscriptions'), 100);
      }
    },
    {
      id: "creator",
      name: "Sou Criador",
      icon: <Sparkles className="w-5 h-5" />,
      onClick: () => {
        console.log('🎯🎯🎯 CategoryMenu: Botão Sou Criador CLICADO!');
        console.log('🎯 Navegando para: /creator-application');
        setOpen(false);
        // Garantir que o menu fecha antes de navegar
        requestAnimationFrame(() => {
          navigate('/creator-application');
          console.log('🎯 Navigate executado!');
        });
      }
    },
    {
      id: "exit",
      name: "Sair",
      icon: <LogOut className="w-5 h-5" />,
      onClick: () => {
        onExit?.();
        setOpen(false);
      }
    }
  ];

  return (
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
            {/* Destaque */}
            <FeaturedSection />
            
            {/* Patrocinado */}
            <AdCarousel />
            
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
                    console.log(`🎯 Clique no botão: ${item.name}`);
                    e.preventDefault();
                    e.stopPropagation();
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
  );
};
