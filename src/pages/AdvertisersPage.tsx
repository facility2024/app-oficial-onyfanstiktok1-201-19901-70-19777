import { useState, memo, useMemo } from "react";
import { ArrowLeft, Phone, Mail, MapPin, Globe, Instagram, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Advertiser {
  id: number;
  name: string;
  category: string;
  image: string;
  description: string;
  contacts: {
    phone?: string;
    email?: string;
    whatsapp?: string;
    instagram?: string;
    website?: string;
    address?: string;
  };
}

const advertisers: Advertiser[] = [
  {
    id: 1,
    name: "Anunciante Premium 1",
    category: "Moda & Estilo",
    image: "/lovable-uploads/0e809378-a44a-46fb-9831-b0966c586bfd.png",
    description: "Especialista em moda íntima premium e lingerie de alta qualidade",
    contacts: {
      phone: "+55 11 98765-4321",
      email: "contato@anunciante1.com",
      whatsapp: "+5511987654321",
      instagram: "@anunciante1",
      website: "https://anunciante1.com",
      address: "Av. Paulista, 1000 - São Paulo, SP"
    }
  },
  {
    id: 2,
    name: "Anunciante Premium 2",
    category: "Beleza & Cosméticos",
    image: "/lovable-uploads/24a5e9ee-1a77-472c-ac34-4fa227321806.png",
    description: "Produtos de beleza e cuidados pessoais exclusivos",
    contacts: {
      phone: "+55 21 98765-4322",
      email: "contato@anunciante2.com",
      whatsapp: "+5521987654322",
      instagram: "@anunciante2",
      website: "https://anunciante2.com",
      address: "Rua das Flores, 500 - Rio de Janeiro, RJ"
    }
  },
  {
    id: 3,
    name: "Anunciante Premium 3",
    category: "Fitness & Bem-estar",
    image: "/lovable-uploads/2746651e-70a4-4bbc-bb71-54ba126863ca.png",
    description: "Suplementos e equipamentos fitness de alta performance",
    contacts: {
      phone: "+55 31 98765-4323",
      email: "contato@anunciante3.com",
      whatsapp: "+5531987654323",
      instagram: "@anunciante3",
      website: "https://anunciante3.com",
      address: "Av. Afonso Pena, 2000 - Belo Horizonte, MG"
    }
  },
  {
    id: 4,
    name: "Anunciante Premium 4",
    category: "Tecnologia",
    image: "/lovable-uploads/2955b0a9-b6b4-486b-9318-e326c29ab668.png",
    description: "Gadgets e tecnologia de ponta para lifestyle digital",
    contacts: {
      phone: "+55 41 98765-4324",
      email: "contato@anunciante4.com",
      whatsapp: "+5541987654324",
      instagram: "@anunciante4",
      website: "https://anunciante4.com",
      address: "Rua XV de Novembro, 300 - Curitiba, PR"
    }
  },
  {
    id: 5,
    name: "Anunciante Premium 5",
    category: "Acessórios",
    image: "/lovable-uploads/3daf81d3-7b41-4709-bb93-5ce0bf4ec3d6.png",
    description: "Acessórios exclusivos e joias personalizadas",
    contacts: {
      phone: "+55 51 98765-4325",
      email: "contato@anunciante5.com",
      whatsapp: "+5551987654325",
      instagram: "@anunciante5",
      website: "https://anunciante5.com",
      address: "Av. Borges de Medeiros, 1500 - Porto Alegre, RS"
    }
  }
];

// Componente de Card otimizado com memo
const AdvertiserCard = memo(({ advertiser, onClick }: { advertiser: Advertiser; onClick: (adv: Advertiser) => void }) => (
  <Card
    className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 overflow-hidden hover:border-red-500 transition-all duration-200 cursor-pointer group will-change-transform"
    onClick={() => onClick(advertiser)}
  >
    <div className="relative h-48 overflow-hidden">
      <img
        src={advertiser.image}
        alt={advertiser.name}
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 will-change-transform"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <span className="absolute top-3 right-3 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">
        Premium
      </span>
    </div>
    <div className="p-5">
      <h3 className="text-xl font-bold text-white mb-2">{advertiser.name}</h3>
      <p className="text-sm text-red-400 mb-3">{advertiser.category}</p>
      <p className="text-sm text-gray-400 line-clamp-2">{advertiser.description}</p>
      <Button
        className="w-full mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-colors duration-200"
        onClick={(e) => {
          e.stopPropagation();
          onClick(advertiser);
        }}
      >
        Ver Contatos
      </Button>
    </div>
  </Card>
));

AdvertiserCard.displayName = 'AdvertiserCard';

export default function AdvertisersPage() {
  const navigate = useNavigate();
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<Advertiser | null>(null);

  const handleContactClick = useMemo(() => (url: string) => {
    window.location.href = url;
  }, []);

  const handleSelectAdvertiser = useMemo(() => (advertiser: Advertiser) => {
    setSelectedAdvertiser(advertiser);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 will-change-scroll">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-gray-800 will-change-transform">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="text-white hover:bg-white/10 transition-colors duration-150"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Anunciantes Premium</h1>
            <p className="text-sm text-gray-400">Conecte-se com nossos parceiros</p>
          </div>
        </div>
      </div>

      {/* Grid de Anunciantes */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advertisers.map((advertiser) => (
            <AdvertiserCard
              key={advertiser.id}
              advertiser={advertiser}
              onClick={handleSelectAdvertiser}
            />
          ))}
        </div>
      </div>

      {/* Modal de Contatos */}
      <Dialog open={!!selectedAdvertiser} onOpenChange={() => setSelectedAdvertiser(null)}>
        <DialogContent className="bg-gradient-to-br from-gray-900 to-black border-gray-800 text-white max-w-md will-change-transform">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {selectedAdvertiser?.name}
            </DialogTitle>
            <p className="text-red-400">{selectedAdvertiser?.category}</p>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <p className="text-gray-300 text-sm">{selectedAdvertiser?.description}</p>
            
            <div className="space-y-3 pt-4 border-t border-gray-800">
              {selectedAdvertiser?.contacts.phone && (
                <button
                  onClick={() => handleContactClick(`tel:${selectedAdvertiser.contacts.phone}`)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150"
                >
                  <Phone className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Telefone</p>
                    <p className="text-sm font-medium">{selectedAdvertiser.contacts.phone}</p>
                  </div>
                </button>
              )}

              {selectedAdvertiser?.contacts.whatsapp && (
                <button
                  onClick={() => handleContactClick(`https://wa.me/${selectedAdvertiser.contacts.whatsapp}`)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150"
                >
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">WhatsApp</p>
                    <p className="text-sm font-medium">Enviar mensagem</p>
                  </div>
                </button>
              )}

              {selectedAdvertiser?.contacts.email && (
                <button
                  onClick={() => handleContactClick(`mailto:${selectedAdvertiser.contacts.email}`)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150"
                >
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">E-mail</p>
                    <p className="text-sm font-medium">{selectedAdvertiser.contacts.email}</p>
                  </div>
                </button>
              )}

              {selectedAdvertiser?.contacts.instagram && (
                <button
                  onClick={() => handleContactClick(`https://instagram.com/${selectedAdvertiser.contacts.instagram}`)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150"
                >
                  <Instagram className="w-5 h-5 text-pink-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Instagram</p>
                    <p className="text-sm font-medium">{selectedAdvertiser.contacts.instagram}</p>
                  </div>
                </button>
              )}

              {selectedAdvertiser?.contacts.website && (
                <button
                  onClick={() => handleContactClick(selectedAdvertiser.contacts.website!)}
                  className="flex items-center gap-3 w-full p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors duration-150"
                >
                  <Globe className="w-5 h-5 text-purple-400" />
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Website</p>
                    <p className="text-sm font-medium">Visitar site</p>
                  </div>
                </button>
              )}

              {selectedAdvertiser?.contacts.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Endereço</p>
                    <p className="text-sm font-medium">{selectedAdvertiser.contacts.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
