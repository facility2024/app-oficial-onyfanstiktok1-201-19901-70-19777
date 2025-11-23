import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

const ProductDetailModal = ({ product, open, onClose, onBuy }: ProductModalProps) => {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= product.average_rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                ({product.total_reviews} avaliações)
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-64 object-cover rounded-lg"
          />

          <div>
            <h3 className="font-semibold text-lg mb-2">Descrição</h3>
            <p className="text-muted-foreground">{product.description}</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Preço</p>
              <p className="text-3xl font-bold text-primary">
                R$ {product.price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estoque</p>
              <p className="text-lg font-semibold">
                {product.stock > 0 ? `${product.stock} unidades` : "Esgotado"}
              </p>
            </div>
          </div>

          <Button
            onClick={() => onBuy(product)}
            disabled={product.stock === 0}
            className="w-full"
            size="lg"
          >
            <ShoppingCart className="mr-2" />
            Comprar Agora
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

const CheckoutModal = ({ product, open, onClose }: CheckoutModalProps) => {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
  });

  const handleCheckout = async () => {
    if (!product || !user) return;

    // Validação básica
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from("marketplace_orders" as any)
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          total_price: product.price,
          status: "pending",
          shipping_address: JSON.stringify(formData),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Gerar pagamento PIX (usar a função existente)
      const { data: pixData, error: pixError } = await supabase.functions.invoke(
        "generate-pix",
        {
          body: {
            amount: product.price,
            name: formData.name,
            email: formData.email,
            whatsapp: formData.phone,
            order_id: (order as any).id,
          },
        }
      );

      if (pixError) throw pixError;

      toast.success("Pedido criado! Prossiga com o pagamento PIX");
      
      // Aqui você pode abrir outro modal com o QR Code do PIX
      // Por enquanto, vamos apenas mostrar o código PIX
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Compra</DialogTitle>
          <DialogDescription>
            Produto: {product.name} - R$ {product.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">WhatsApp *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label htmlFor="address">Endereço *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="zipcode">CEP</Label>
            <Input
              id="zipcode"
              value={formData.zipcode}
              onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
              placeholder="00000-000"
            />
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Processando..." : "Pagar com PIX"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
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
    // Se há um productId na URL e os produtos foram carregados, abrir o modal
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
      const { data, error } = await supabase
        .from("marketplace_products" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts((data as any) || []);
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

  const categories = ["all", ...new Set(products.map((p) => p.category))];
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Marketplace</h1>
          </div>
        </div>
      </div>

      {/* Categorias */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category === "all" ? "Todos" : category}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="container mx-auto px-4 pb-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleProductClick(product)}
              >
                <CardContent className="p-3">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-md mb-3"
                  />
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= product.average_rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({product.total_reviews})
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    R$ {product.price.toFixed(2)}
                  </p>
                  {product.stock === 0 && (
                    <p className="text-xs text-destructive mt-1">Esgotado</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onBuy={handleBuyClick}
      />

      <CheckoutModal
        product={selectedProduct}
        open={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
      />
    </div>
  );
}
