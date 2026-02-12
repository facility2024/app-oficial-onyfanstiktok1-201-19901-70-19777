import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowLeft, Sparkles, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ModelCarousel } from "@/components/tiktok/ModelCarousel";
import { AdCarousel } from "@/components/tiktok/AdCarousel";
import logoWhite from "@/assets/coconudi-logo-white.png";
import useEmblaCarousel from "embla-carousel-react";
import bannerAtualizacao from "@/assets/banner-atualizacao-mensal.png";

const VIDEO_GENRES = [
  { name: "Gays", icon: "🏳️‍🌈" },
  { name: "Travesti", icon: "🌈" },
  { name: "Bunda", icon: "🍑" },
  { name: "Dupla", icon: "👥" },
  { name: "Grupo", icon: "👫" },
  { name: "Swing", icon: "🔄" },
  { name: "Lésbica", icon: "👩‍❤️‍👩" },
  { name: "Hétero", icon: "💑" },
  { name: "Peitos GG", icon: "🍈" },
];
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  video_url?: string;
  category: string;
  stock: number;
  average_rating: number;
  total_reviews: number;
  hoopay_sales_url?: string;
}
interface ProductModalProps {
  product: (Product & { hoopay_sales_url?: string }) | null;
  open: boolean;
  onClose: () => void;
  onBuy: (product: Product) => void;
}
const ProductDetailModal = ({
  product,
  open,
  onClose,
  onBuy
}: ProductModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Reset video state when modal closes
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [open]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-gray-900 !border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">{product.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    className={`w-5 h-5 ${star <= product.average_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} 
                  />
                ))}
              </div>
              <span className="text-sm text-gray-400">
                ({product.total_reviews} avaliações)
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video or Image */}
          {product.video_url ? (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={product.video_url}
                poster={product.image_url}
                className="w-full max-h-80 object-contain"
                playsInline
                loop
                muted={isMuted}
                onClick={togglePlay}
              />
              
              {/* Video Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              {/* Play overlay when paused */}
              {!isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-64 object-cover rounded-lg" 
            />
          )}

          <div>
            <h3 className="font-semibold text-lg mb-2 text-white">Descrição</h3>
            <p className="text-gray-400">{product.description}</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              <p className="text-sm text-gray-400">Preço</p>
              <p className="text-3xl font-bold text-green-400">
                R$ {product.price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Estoque</p>
              <p className="text-lg font-semibold text-white">
                {product.stock > 0 ? `${product.stock} unidades` : "Esgotado"}
              </p>
            </div>
          </div>

          <Button 
            onClick={() => onBuy(product)} 
            disabled={product.stock === 0} 
            className="w-full bg-gradient-to-r from-[#7CB342] to-[#C4842E] hover:from-[#558B2F] hover:to-[#8B4513]" 
            size="lg"
          >
            <ShoppingCart className="mr-2" />
            Comprar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
interface CheckoutModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}
const CheckoutModal = ({
  product,
  open,
  onClose
}: CheckoutModalProps) => {
  const {
    user
  } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipcode: ""
  });
  const handleCheckout = async () => {
    if (!product || !user) return;
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const {
        data: order,
        error: orderError
      } = await supabase.from("marketplace_orders" as any).insert({
        user_id: user.id,
        product_id: product.id,
        quantity: 1,
        total_price: product.price,
        status: "pending",
        shipping_address: JSON.stringify(formData)
      }).select().single();
      if (orderError) throw orderError;
      const {
        data: pixData,
        error: pixError
      } = await supabase.functions.invoke("generate-pix", {
        body: {
          amount: product.price,
          name: formData.name,
          email: formData.email,
          whatsapp: formData.phone,
          order_id: (order as any).id
        }
      });
      if (pixError) throw pixError;
      toast.success("Pedido criado! Prossiga com o pagamento PIX");
      toast.info(`Código PIX: ${pixData.pix_code}`);
      onClose();
    } catch (error) {
      console.error("Erro no checkout:", error);
      toast.error("Erro ao processar pedido");
    } finally {
      setLoading(false);
    }
  };
  if (!product) return null;
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto !bg-gray-900 !border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Finalizar Compra</DialogTitle>
          <DialogDescription className="text-gray-400">
            Produto: {product.name} - R$ {product.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Nome Completo *</Label>
            <Input id="name" value={formData.name} onChange={e => setFormData({
            ...formData,
            name: e.target.value
          })} placeholder="Seu nome completo" className="bg-gray-800 border-white/10 text-white" />
          </div>

          <div>
            <Label htmlFor="email" className="text-white">E-mail *</Label>
            <Input id="email" type="email" value={formData.email} onChange={e => setFormData({
            ...formData,
            email: e.target.value
          })} placeholder="seu@email.com" className="bg-gray-800 border-white/10 text-white" />
          </div>

          <div>
            <Label htmlFor="phone" className="text-white">WhatsApp *</Label>
            <Input id="phone" value={formData.phone} onChange={e => setFormData({
            ...formData,
            phone: e.target.value
          })} placeholder="(00) 00000-0000" className="bg-gray-800 border-white/10 text-white" />
          </div>

          <div>
            <Label htmlFor="address" className="text-white">Endereço *</Label>
            <Input id="address" value={formData.address} onChange={e => setFormData({
            ...formData,
            address: e.target.value
          })} placeholder="Rua, número, complemento" className="bg-gray-800 border-white/10 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city" className="text-white">Cidade</Label>
              <Input id="city" value={formData.city} onChange={e => setFormData({
              ...formData,
              city: e.target.value
            })} placeholder="Cidade" className="bg-gray-800 border-white/10 text-white" />
            </div>
            <div>
              <Label htmlFor="state" className="text-white">Estado</Label>
              <Input id="state" value={formData.state} onChange={e => setFormData({
              ...formData,
              state: e.target.value
            })} placeholder="UF" maxLength={2} className="bg-gray-800 border-white/10 text-white" />
            </div>
          </div>

          <div>
            <Label htmlFor="zipcode" className="text-white">CEP</Label>
            <Input id="zipcode" value={formData.zipcode} onChange={e => setFormData({
            ...formData,
            zipcode: e.target.value
          })} placeholder="00000-000" className="bg-gray-800 border-white/10 text-white" />
          </div>

          <Button onClick={handleCheckout} disabled={loading} className="w-full bg-gradient-to-r from-[#7CB342] to-[#C4842E] hover:from-[#558B2F] hover:to-[#8B4513]" size="lg">
            {loading ? "Processando..." : "Pagar com PIX"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('product');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreVideos, setGenreVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 3
  });
  useEffect(() => {
    fetchProducts();
  }, []);
  useEffect(() => {
    if (productIdFromUrl && products.length > 0) {
      const product = products.find(p => p.id === productIdFromUrl);
      if (product) {
        setSelectedProduct(product);
        setShowDetailModal(true);
      }
    }
  }, [productIdFromUrl, products]);

  const fetchGenreVideos = async (genre: string) => {
    setLoadingVideos(true);
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*, models(name, profile_image_url), profiles:creator_id(username, avatar_url)")
        .eq("is_active", true)
        .contains("genres", [genre])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setGenreVideos(data || []);
    } catch (error) {
      console.error("Erro ao carregar vídeos do gênero:", error);
      setGenreVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleGenreClick = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setGenreVideos([]);
    } else {
      setSelectedGenre(genre);
      fetchGenreVideos(genre);
    }
  };

  const fetchProducts = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("marketplace_products" as any).select("*").eq("is_active", true).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setProducts(data as any || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };
  const handleBuyClick = (product: Product) => {
    // Se tem URL da Hoopay, redireciona direto
    if (product.hoopay_sales_url) {
      window.open(product.hoopay_sales_url, '_blank');
      setShowDetailModal(false);
      return;
    }
    
    // Comportamento original: abre checkout interno
    setShowDetailModal(false);
    setSelectedProduct(product);
    setShowCheckoutModal(true);
  };
  const categories = ["all", ...new Set(products.map(p => p.category))];
  const filteredProducts = selectedCategory === "all" ? products : products.filter(p => p.category === selectedCategory);
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Carregando produtos...</p>
      </div>;
  }
  return <div className="fixed inset-0 bg-black overflow-y-auto overflow-x-hidden">
      <div className="min-h-full pb-20">
        {/* Header com Gradiente Colorido */}
        <div className="sticky top-0 z-20 backdrop-blur-sm border-b border-white/10" style={{
        background: 'linear-gradient(135deg, rgba(124, 179, 66, 0.95) 0%, rgba(85, 139, 47, 0.95) 35%, rgba(196, 132, 46, 0.95) 70%, rgba(139, 69, 19, 0.95) 100%)'
      }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="text-white hover:bg-white/20">
              <ArrowLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex items-center gap-3">
              <img src={logoWhite} alt="CocoNudi" className="h-8" />
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wider">
                MARKETPLACE
              </h1>
            </div>

            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* TOP 10 MODELOS Carousel */}
      <div className="bg-gradient-to-b from-gray-900 to-black py-6 border-b border-white/10">
        <div className="container mx-auto px-4">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            TOP 10 MODELOS
          </h2>
          <ModelCarousel title="" icon={null} direction="ltr" carouselIndex={0} />
        </div>
      </div>

      {/* Banner Promocional */}
      <div className="container mx-auto px-4 py-6">
        <img 
          src={bannerAtualizacao} 
          alt="Atualização Mensal de Conteúdos Exclusivos CocoNudi" 
          className="w-full rounded-lg object-cover"
        />
      </div>

      {/* CATEGORIAS - Gênero */}
      <div className="container mx-auto px-4 py-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-xl">CATEGORIAS - GÊNERO</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {VIDEO_GENRES.map(genre => (
            <Button 
              key={genre.name} 
              variant={selectedGenre === genre.name ? "default" : "outline"} 
              onClick={() => handleGenreClick(genre.name)} 
              className={`whitespace-nowrap px-4 py-2 ${
                selectedGenre === genre.name 
                  ? "bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white border-none" 
                  : "bg-gray-800 text-white border-white/20 hover:bg-gray-700"
              }`}
            >
              {genre.icon} {genre.name}
            </Button>
          ))}
        </div>

        {/* Vídeos do gênero selecionado */}
        {selectedGenre && (
          <div className="mt-6">
            <h3 className="text-white font-bold text-lg mb-4">
              Vídeos - {selectedGenre}
            </h3>
            {loadingVideos ? (
              <p className="text-gray-400 text-center py-8">Carregando vídeos...</p>
            ) : genreVideos.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum vídeo encontrado nesta categoria</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {genreVideos.map(video => (
                  <div 
                    key={video.id} 
                    className="relative rounded-lg overflow-hidden cursor-pointer group bg-gray-900"
                    onClick={() => navigate(`/app?video=${video.id}`)}
                  >
                    <img 
                      src={video.thumbnail_url || ''} 
                      alt={video.title || 'Vídeo'} 
                      className="w-full aspect-[9/16] object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs font-semibold line-clamp-2">
                        {video.title || (video.models?.name || video.profiles?.username || 'Vídeo')}
                      </p>
                      <p className="text-gray-300 text-[10px] mt-0.5">
                        {video.models?.name || video.profiles?.username || ''}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 rounded-full p-2">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PRODUTOS EM ALTA */}
      <div className="container mx-auto px-4 pb-8">
        <h2 className="text-white font-bold text-xl mb-4">PRODUTOS EM ALTA</h2>
        
        {filteredProducts.length === 0 ? <div className="text-center py-12">
            <p className="text-gray-400">Nenhum produto encontrado</p>
          </div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => <Card key={product.id} className="cursor-pointer hover:scale-105 transition-transform !bg-gray-900/50 !border-white/10" onClick={() => handleProductClick(product)}>
                <CardContent className="p-3">
                  <div className="relative mb-3 group">
                    <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-md" />
                    
                    {/* Video Play Icon */}
                    {product.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 rounded-full p-3 group-hover:bg-black/70 group-hover:scale-110 transition-all duration-200">
                          <Play className="w-8 h-8 text-white fill-white" />
                        </div>
                      </div>
                    )}
                    
                    {product.stock > 0 && product.stock <= 5 && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Últimas {product.stock}
                      </div>}
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-1 line-clamp-1 text-white">
                    {product.name}
                  </h3>
                  
                  {product.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                      {product.description}
                    </p>}
                  
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`w-3 h-3 ${star <= product.average_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />)}
                    <span className="text-xs text-gray-400 ml-1">
                      ({product.total_reviews})
                    </span>
                  </div>
                  
                  {product.stock === 0 && <p className="text-xs text-red-400 mt-1 font-semibold">Esgotado</p>}
                </CardContent>
              </Card>)}
          </div>}
      </div>

      {/* Banner de Anúncio */}
      <div className="container mx-auto px-4 pb-8">
        <AdCarousel />
      </div>

      {/* Modals */}
      <ProductDetailModal product={selectedProduct} open={showDetailModal} onClose={() => setShowDetailModal(false)} onBuy={handleBuyClick} />

      <CheckoutModal product={selectedProduct} open={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} />
      </div>
    </div>;
}