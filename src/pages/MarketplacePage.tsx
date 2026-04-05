import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
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
import { BannerCarousel } from "@/components/tiktok/BannerCarousel";
import { PhysicalProductsSection } from "@/components/tiktok/PhysicalProductsSection";
import logoWhite from "@/assets/coconudi-logo-new.png";
import useEmblaCarousel from "embla-carousel-react";
import bannerAtualizacao from "@/assets/banner-atualizacao-mensal.png";
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
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <span className="text-sm text-gray-400">
                (5.0)
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
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 font-bold text-base animate-pulse drop-shadow-[0_0_8px_rgba(0,255,150,0.6)]">
              {product.description}
            </p>
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
  const [genreProducts, setGenreProducts] = useState<Product[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [modelsToShow, setModelsToShow] = useState(12);
  const [productsToShow, setProductsToShow] = useState(15);
  const [dynamicGenres, setDynamicGenres] = useState<{name: string; icon: string}[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    slidesToScroll: 3
  });
  // Ler gênero da URL ao montar
  const genreFromUrl = searchParams.get('genre');

  // Fetch genres from database
  const fetchMarketplaceGenres = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('video_genres')
        .select('name, icon')
        .eq('is_active', true)
        .neq('name', 'Todos')
        .order('display_order', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setDynamicGenres(data);
      }
    } catch (err) {
      console.error('Erro ao carregar gêneros:', err);
    }
  };
  
  const fetchStores = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('marketplace_stores')
        .select('id, name, slug, logo_url, description, is_verified')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (!error && data) setStores(data);
    } catch (err) {
      console.error('Erro ao carregar lojas:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchAllModels();
    fetchFeaturedVideos();
    fetchMarketplaceGenres();
    fetchStores();
    // Auto-selecionar gênero da URL
    if (genreFromUrl && !selectedGenre) {
      setSelectedGenre(genreFromUrl);
      fetchGenreVideos(genreFromUrl);
    }
  }, []);

  const fetchFeaturedVideos = async () => {
    setLoadingFeatured(true);
    try {
      const { data, error } = await (supabase
        .from("videos")
        .select("*, models(name, profile_image_url)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(20) as any);

      if (error) throw error;
      setFeaturedVideos(data || []);
    } catch (error) {
      console.error("Erro ao carregar vídeos em alta:", error);
      setFeaturedVideos([]);
    } finally {
      setLoadingFeatured(false);
    }
  };
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
      // Buscar vídeos filtrando por category OU genres (array)
      const { data: allVideos, error: videoError } = await (supabase
        .from("videos")
        .select("*, models(name, profile_image_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false }) as any);

      if (videoError) {
        console.error('❌ Erro ao buscar vídeos:', videoError);
        setGenreVideos([]);
      } else if (allVideos) {
        const g = genre.toLowerCase();
        const filtered = allVideos.filter((v: any) => {
          // Verificar coluna category
          const cat = (v.category || '').toLowerCase();
          const matchCategory = cat.includes(g) || g.includes(cat);
          // Verificar coluna genres (array)
          const matchGenres = Array.isArray(v.genres) && v.genres.some(
            (genreName: string) => genreName.toLowerCase().includes(g) || g.includes(genreName.toLowerCase())
          );
          return matchCategory || matchGenres;
        });
        console.log(`🎬 Vídeos filtrados para "${genre}": ${filtered.length}`);
        setGenreVideos(filtered);
      } else {
        setGenreVideos([]);
      }

      // Buscar marketplace_products cuja categoria corresponde ao gênero
      console.log('🔍 Buscando produtos para gênero:', genre);
      
      const { data: allProds, error: prodError } = await (supabase
        .from("marketplace_products" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }) as any);

      if (prodError) {
        console.error('❌ Erro ao buscar produtos:', prodError);
        setGenreProducts([]);
        return;
      }

      if (allProds) {
        console.log('📦 Todas categorias disponíveis:', [...new Set(allProds.map((p: any) => p.category))]);
        const filtered = allProds.filter((p: any) => {
          const cat = (p.category || '').toLowerCase();
          const g = genre.toLowerCase();
          return cat.includes(g) || g.includes(cat);
        });
        console.log('📦 Produtos filtrados para', genre, ':', filtered.length);
        setGenreProducts(filtered as Product[]);
      } else {
        setGenreProducts([]);
      }
    } catch (error) {
      console.error("Erro ao carregar conteúdo do gênero:", error);
      setGenreVideos([]);
      setGenreProducts([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleGenreClick = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setGenreVideos([]);
      setGenreProducts([]);
    } else {
      setSelectedGenre(genre);
      fetchGenreVideos(genre);
    }
  };

  const fetchAllModels = async () => {
    try {
      const { data, error } = await supabase
        .from('models')
        .select('id, name, username, avatar_url, profile_image_url, followers_count')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (!error && data) {
        setAllModels(data);
      }
    } catch (err) {
      console.error("Erro ao carregar modelos:", err);
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

  // Lista de nomes de gêneros (exceto Hétero) para filtrar da tela principal
  const nonHeteroGenres = dynamicGenres
    .filter(g => g.name !== 'Hétero')
    .map(g => g.name.toLowerCase());

  // Função para verificar se um item pertence a um gênero não-Hétero
  const belongsToNonHeteroGenre = (item: any) => {
    const cat = (item.category || '').toLowerCase();
    const genres = Array.isArray(item.genres) ? item.genres.map((g: string) => g.toLowerCase()) : [];
    return nonHeteroGenres.some(g => 
      cat.includes(g) || g.includes(cat) || genres.some((ig: string) => ig.includes(g) || g.includes(ig))
    );
  };

  // Produtos filtrados para a home (apenas Hétero ou sem gênero específico)
  const homeProducts = products.filter(p => !belongsToNonHeteroGenre(p));
  const homeFeaturedVideos = featuredVideos.filter(v => !belongsToNonHeteroGenre(v));
  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Carregando produtos...</p>
      </div>;
  }
  return <div className="fixed inset-0 bg-black overflow-y-auto overflow-x-hidden">
      <div className="min-h-full pb-20">
        {/* Header com Gradiente Colorido */}
        <div className="sticky top-0 z-20 bg-gray-900 backdrop-blur-sm border-b border-white/10">
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
          <ModelCarousel title="" icon={null} direction="ltr" carouselIndex={0} onSelectModel={(modelId) => navigate(`/app?profile=${modelId}`)} />
        </div>
      </div>

      {/* Banner Promocional - Lojinha da Coco Nudi - Carousel */}
      <div className="container mx-auto px-2 sm:px-4 py-6">
        <div className="w-full max-w-4xl mx-auto">
          <BannerCarousel />
        </div>
      </div>

      {/* CATEGORIAS - Gênero (horizontal scroll) */}
      <div className="container mx-auto px-4 py-4 border-t border-white/10">
        <h2 className="text-white font-bold text-lg mb-3">CATEGORIAS - GÊNERO</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {dynamicGenres.map(genre => (
            <button
              key={genre.name}
              onClick={() => handleGenreClick(genre.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedGenre === genre.name
                  ? 'bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white shadow-lg'
                  : 'bg-gray-800 text-white border border-white/20 hover:bg-gray-700'
              }`}
            >
              <span>{genre.icon}</span>
              <span className="whitespace-nowrap">{genre.name}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo do gênero selecionado */}
        {selectedGenre && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{selectedGenre}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedGenre(null); setGenreVideos([]); setGenreProducts([]); }}
                className="bg-gray-800 text-white border border-white/20 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            </div>

            {loadingVideos ? (
              <p className="text-gray-400 text-center py-8">Carregando conteúdo...</p>
            ) : genreVideos.length === 0 && genreProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum conteúdo encontrado nesta categoria</p>
            ) : (
              <div className="space-y-6">
                {genreProducts.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {genreProducts.map(product => (
                      <div
                        key={product.id}
                        className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer group border border-white/5 hover:border-white/20 transition-colors"
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="relative aspect-square overflow-hidden">
                          {product.video_url ? (
                            <>
                              <video src={product.video_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" muted playsInline preload="metadata" poster={product.image_url} />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm"><Play className="w-6 h-6 text-white fill-white" /></div>
                              </div>
                            </>
                          ) : (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                        <div className="p-2">
                          <p className="text-white text-xs font-semibold line-clamp-1">{product.name}</p>
                          <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 text-[10px] font-bold line-clamp-1 animate-pulse drop-shadow-[0_0_6px_rgba(0,255,150,0.5)]">{product.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-green-400 text-sm font-bold">R$ {product.price.toFixed(2)}</span>
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /><span className="text-yellow-400 text-[10px] font-medium">5.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {genreVideos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {genreVideos.map(video => (
                      <div key={video.id} className="relative rounded-lg overflow-hidden cursor-pointer group bg-gray-900" onClick={() => navigate(`/app?video=${video.id}`)}>
                        <img src={video.thumbnail_url || ''} alt={video.title || 'Vídeo'} className="w-full aspect-[9/16] object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-white text-xs font-semibold line-clamp-2">{video.title || (video.models?.name || video.profiles?.username || 'Vídeo')}</p>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 rounded-full p-2"><Play className="w-6 h-6 text-white fill-white" /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LOJAS SaaS */}
      {!selectedGenre && stores.length > 0 && (
        <div className="container mx-auto px-4 py-6 border-t border-white/10">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            🏪 LOJAS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {stores.map(store => (
              <div
                key={store.id}
                className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer group border border-white/10 hover:border-primary/40 transition-all"
                onClick={() => navigate(`/marketplace/loja/${store.slug}`)}
              >
                <div className="aspect-square overflow-hidden bg-gray-800 flex items-center justify-center">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                    />
                  ) : (
                    <span className="text-4xl">🏪</span>
                  )}
                </div>
                <div className="p-3 text-center">
                  <p className="text-white text-sm font-semibold truncate flex items-center justify-center gap-1">
                    {store.name}
                    {store.is_verified && <span className="text-primary text-xs">✓</span>}
                  </p>
                  {store.description && (
                    <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">{store.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORIAS - Gênero */}
      <div className="container mx-auto px-4 py-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-xl">CATEGORIAS - GÊNERO</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {dynamicGenres.map(genre => (
            <Button 
              key={genre.name} 
              variant={selectedGenre === genre.name ? "default" : "outline"} 
              onClick={() => handleGenreClick(genre.name)} 
              className={`w-full px-2 py-2.5 text-sm flex items-center justify-center gap-1.5 ${
                selectedGenre === genre.name 
                  ? "bg-gradient-to-r from-[#7CB342] to-[#C4842E] text-white border-none" 
                  : "bg-gray-800 text-white border-white/20 hover:bg-gray-700"
              }`}
            >
              <span>{genre.icon}</span>
              <span className="truncate">{genre.name}</span>
            </Button>
          ))}
        </div>

        {/* Conteúdo do gênero selecionado */}
        {selectedGenre && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">
                {selectedGenre}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedGenre(null); setGenreVideos([]); setGenreProducts([]); }}
                className="bg-gray-800 text-white border border-white/20 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
            </div>

            {loadingVideos ? (
              <p className="text-gray-400 text-center py-8">Carregando conteúdo...</p>
            ) : genreVideos.length === 0 && genreProducts.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nenhum conteúdo encontrado nesta categoria</p>
            ) : (
              <div className="space-y-6">
                {/* Produtos do marketplace nesta categoria */}
                {genreProducts.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {genreProducts.map(product => (
                      <div
                        key={product.id}
                        className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer group border border-white/5 hover:border-white/20 transition-colors"
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="relative aspect-square overflow-hidden">
                          {product.video_url ? (
                            <>
                              <video
                                src={product.video_url}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                muted
                                playsInline
                                preload="metadata"
                                poster={product.image_url}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
                                  <Play className="w-6 h-6 text-white fill-white" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                        <div className="p-2">
                          <p className="text-white text-xs font-semibold line-clamp-1">{product.name}</p>
                          <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 text-[10px] font-bold line-clamp-1 animate-pulse drop-shadow-[0_0_6px_rgba(0,255,150,0.5)]">{product.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-green-400 text-sm font-bold">R$ {product.price.toFixed(2)}</span>
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-yellow-400 text-[10px] font-medium">5.0</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vídeos do gênero */}
                {genreVideos.length > 0 && (
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
        )}
      </div>

      {/* MODELOS - Grid com todas as modelos por nome */}
      {!selectedGenre && (
        <div className="container mx-auto px-4 pb-8">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            👑 TODAS AS MODELOS
          </h2>
          
          {allModels.length === 0 ? (
            <div className="relative border border-cyan-400/30 rounded-xl p-6 text-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-[0_0_20px_rgba(0,255,200,0.15)]">
              <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 drop-shadow-[0_0_10px_rgba(0,255,150,0.6)] animate-pulse mb-2">
                💡 Não encontrou o que procurava?
              </h3>
              <p className="text-gray-300 text-sm mb-4">Deixe sua mensagem de feedback e vamos adicionar o que você procura!</p>
              <Textarea
                placeholder="Escreva aqui o que gostaria de encontrar..."
                className="bg-gray-950 border-cyan-400/30 text-white placeholder:text-gray-500 mb-3 focus:border-cyan-400 focus:ring-cyan-400/30"
                rows={3}
                id="marketplace-feedback"
              />
              <Button
                onClick={() => {
                  const el = document.getElementById('marketplace-feedback') as HTMLTextAreaElement;
                  const msg = el?.value?.trim();
                  if (!msg) { toast.error('Escreva sua sugestão antes de enviar'); return; }
                  (supabase as any).from('marketplace_feedback').insert({ message: msg, user_email: null }).then(() => {
                    toast.success('Feedback enviado com sucesso! Obrigado 🎉');
                    el.value = '';
                  });
                }}
                className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold px-8"
              >
                ✉️ Enviar Feedback
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {allModels.slice(0, modelsToShow).map(model => (
                  <div 
                    key={model.id} 
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => navigate(`/app?profile=${model.id}`)}
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-1.5 bg-gray-800">
                      <img 
                        src={model.profile_image_url || model.avatar_url || '/placeholder.svg'} 
                        alt={model.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>
                    <p className="text-white text-xs font-semibold text-center line-clamp-1 w-full">
                      {model.name}
                    </p>
                  </div>
                ))}
              </div>
              {allModels.length > modelsToShow && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setModelsToShow(prev => prev + 12)}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    Ver mais modelos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PRODUTOS FÍSICOS - Seção da lojinha */}
      {!selectedGenre && <PhysicalProductsSection />}

      {/* PRODUTOS POR MODELO (marketplace_products por categoria) */}
      {!selectedGenre && (
        <div className="container mx-auto px-4 pb-8">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            🛍️ PRODUTOS POR MODELO
          </h2>

          {homeProducts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum produto encontrado</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {homeProducts.slice(0, productsToShow).map(product => (
                  <div
                    key={product.id}
                    className="bg-gray-900 rounded-lg overflow-hidden cursor-pointer group border border-white/5 hover:border-white/20 transition-colors"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {product.video_url ? (
                        <>
                          <video
                            src={product.video_url}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            muted
                            playsInline
                            preload="metadata"
                            poster={product.image_url}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/40 rounded-full p-3 backdrop-blur-sm">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    </div>
                    <div className="p-2">
                      <p className="text-white text-xs font-semibold line-clamp-1">{product.name}</p>
                      <p className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-green-300 text-[10px] font-bold line-clamp-1 animate-pulse drop-shadow-[0_0_6px_rgba(0,255,150,0.5)]">{product.description}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-green-400 text-sm font-bold">R$ {product.price.toFixed(2)}</span>
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-yellow-400 text-[10px] font-medium">5.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {homeProducts.length > productsToShow && (
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setProductsToShow(prev => prev + 15)}
                    className="bg-gray-800 text-white border border-white/20 hover:bg-gray-700 px-6"
                  >
                    Ver mais produtos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PRODUTOS EM ALTA - Apenas vídeos com is_featured = true */}
      {!selectedGenre && homeFeaturedVideos.length > 0 && (
        <div className="container mx-auto px-4 pb-8">
          <h2 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
            🔥 PRODUTOS EM ALTA
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {homeFeaturedVideos.map(video => (
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
                <div className="absolute top-2 left-2">
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🔥 EM ALTA</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-semibold line-clamp-2">
                    {video.title || (video.models?.name || video.profiles?.username || 'Vídeo')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner de Anúncio - Formato 800x220 responsivo */}
      <div className="container mx-auto px-4 pb-8 flex justify-center">
        <div className="overflow-hidden" style={{ width: '600px', maxWidth: '100%', height: '300px' }}>
          <AdCarousel location="marketplace" />
        </div>
      </div>

      {/* Modals */}
      <ProductDetailModal product={selectedProduct} open={showDetailModal} onClose={() => setShowDetailModal(false)} onBuy={handleBuyClick} />

      <CheckoutModal product={selectedProduct} open={showCheckoutModal} onClose={() => setShowCheckoutModal(false)} />
      </div>
    </div>;
}