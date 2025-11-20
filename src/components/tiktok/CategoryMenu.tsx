import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Home, Users, TrendingUp, Star, Settings, LogOut, Heart, Flame, Sparkles, Video } from "lucide-react";
import { useState } from "react";
import coconutIcon from "@/assets/coconut-icon.png";
import { UserMenuHeader } from "./UserMenuHeader";

interface CategoryItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface Category {
  title: string;
  items: CategoryItem[];
}

interface CategoryMenuProps {
  onNavigateHome?: () => void;
  onOpenSearch?: () => void;
  onOpenLive?: () => void;
  onExit?: () => void;
}

export const CategoryMenu = ({ 
  onNavigateHome, 
  onOpenSearch, 
  onOpenLive,
  onExit 
}: CategoryMenuProps) => {
  const [open, setOpen] = useState(false);

  const categories: Category[] = [
    {
      title: "Navegação",
      items: [
        {
          id: "home",
          name: "Início",
          icon: <Home className="w-5 h-5" />,
          onClick: () => {
            onNavigateHome?.();
            setOpen(false);
          }
        },
        {
          id: "trending",
          name: "Em Alta",
          icon: <TrendingUp className="w-5 h-5" />,
          onClick: () => {
            console.log("Em Alta clicado");
            setOpen(false);
          }
        },
        {
          id: "live",
          name: "Lives",
          icon: <Video className="w-5 h-5" />,
          onClick: () => {
            onOpenLive?.();
            setOpen(false);
          }
        }
      ]
    },
    {
      title: "Categorias",
      items: [
        {
          id: "favorites",
          name: "Favoritos",
          icon: <Heart className="w-5 h-5" />,
          onClick: () => {
            console.log("Favoritos clicado");
            setOpen(false);
          }
        },
        {
          id: "popular",
          name: "Mais Popular",
          icon: <Flame className="w-5 h-5" />,
          onClick: () => {
            console.log("Mais Popular clicado");
            setOpen(false);
          }
        },
        {
          id: "premium",
          name: "Premium",
          icon: <Sparkles className="w-5 h-5" />,
          onClick: () => {
            console.log("Premium clicado");
            setOpen(false);
          }
        },
        {
          id: "following",
          name: "Seguindo",
          icon: <Users className="w-5 h-5" />,
          onClick: () => {
            console.log("Seguindo clicado");
            setOpen(false);
          }
        }
      ]
    },
    {
      title: "Conta",
      items: [
        {
          id: "starred",
          name: "Destaques",
          icon: <Star className="w-5 h-5" />,
          onClick: () => {
            console.log("Destaques clicado");
            setOpen(false);
          }
        },
        {
          id: "settings",
          name: "Configurações",
          icon: <Settings className="w-5 h-5" />,
          onClick: () => {
            console.log("Configurações clicado");
            setOpen(false);
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
      ]
    }
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-black/95 backdrop-blur-xl border-r border-white/10 p-0">
        <SheetHeader className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src={coconutIcon} 
              alt="Coconudi" 
              className="w-10 h-10 rounded-full"
            />
            <SheetTitle className="text-white text-2xl font-bold tracking-tight">
              coconudi
            </SheetTitle>
          </div>
        </SheetHeader>
        
        {/* Header do Usuário */}
        <UserMenuHeader />
        
        <div className="overflow-y-auto h-[calc(100vh-80px)] py-4">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <h3 className="px-6 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start px-6 py-3 text-white hover:bg-white/10 rounded-none"
                    onClick={item.onClick}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
