import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ModelCarousel } from "@/components/tiktok/ModelCarousel";
import { AdCarousel } from "@/components/tiktok/AdCarousel";
import logoWhite from "@/assets/coconudi-logo-white.png";
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
  average_rating: number;
  total_reviews: number;
}
interface ProductModalProps {
  product: Product | null;
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
  if (!product) return null;
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto !bg-gray-900 !border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">{product.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`w-5 h-5 ${star <= product.average_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />)}
              </div>
              <span className="text-sm text-gray-400">
                ({product.total_reviews} avaliações)
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <img src={product.image_url} alt={product.name} className="w-full h-64 object-cover rounded-lg" />

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

          <Button onClick={() => onBuy(product)} disabled={product.stock === 0} className="w-full bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600" size="lg">
            <ShoppingCart className="mr-2" />
            Comprar Agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
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

          <Button onClick={handleCheckout} disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600" size="lg">
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
        background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.95) 0%, rgba(124, 252, 0, 0.95) 25%, rgba(255, 193, 7, 0.95) 50%, rgba(255, 152, 0, 0.95) 75%, rgba(255, 87, 34, 0.95) 100%)'
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
        <Card className="!bg-gradient-to-br !from-purple-600 !to-pink-600 !border-none overflow-hidden relative">
          <CardContent className="p-6 text-center">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <Sparkles className="w-12 h-12 text-yellow-300 mx-auto mb-3 animate-pulse" />
              <h3 className="text-white text-2xl md:text-3xl font-bold mb-2">
                ATUALIZAÇÃO MENSAL
              </h3>
              <p className="text-white/90 text-lg">
                DE CONTEÚDOS EXCLUSIVOS COCO NUDI
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CATEGORIAS - Gênero */}
      <div className="container mx-auto px-4 py-6 border-t border-white/10">
        <h2 className="text-white font-bold text-xl mb-4">CATEGORIAS - Gênero</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map(category => <Button key={category} variant={selectedCategory === category ? "default" : "outline"} onClick={() => setSelectedCategory(category)} className={`whitespace-nowrap flex-shrink-0 min-w-fit px-4 py-2 ${selectedCategory === category ? "bg-gradient-to-r from-green-500 to-yellow-500 text-white border-none" : "bg-gray-800 text-white border-white/20 hover:bg-gray-700"}`}>
              {category === "all" ? "Todos" : category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>)}
        </div>
      </div>

      {/* PRODUTOS EM ALTA */}
      <div className="container mx-auto px-4 pb-8">
        <h2 className="text-white font-bold text-xl mb-4">PRODUTOS EM ALTA</h2>
        
        {filteredProducts.length === 0 ? <div className="text-center py-12">
            <p className="text-gray-400">Nenhum produto encontrado</p>
          </div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => <Card key={product.id} className="cursor-pointer hover:scale-105 transition-transform !bg-gray-900/50 !border-white/10" onClick={() => handleProductClick(product)}>
                <CardContent className="p-3">
                  <div className="relative mb-3">
                    <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-md" />
                    {product.stock > 0 && product.stock <= 5 && <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                        Últimas {product.stock}
                      </div>}
                  </div>
                  
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-white">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`w-3 h-3 ${star <= product.average_rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />)}
                    <span className="text-xs text-gray-400 ml-1">
                      ({product.total_reviews})
                    </span>
                  </div>
                  
                  <p className="text-lg font-bold text-green-400">
                    R$ {product.price.toFixed(2)}
                  </p>
                  
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