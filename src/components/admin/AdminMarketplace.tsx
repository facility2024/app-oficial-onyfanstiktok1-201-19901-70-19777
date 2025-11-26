import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, EyeOff, ShoppingCart, Package, DollarSign, Star, Search } from 'lucide-react';
import { z } from 'zod';

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
  is_active: boolean;
  created_at: string;
}

const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  description: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  price: z.number().positive('Preço deve ser maior que zero'),
  image_url: z.string().url('URL da imagem inválida'),
  category: z.string().min(2, 'Categoria é obrigatória'),
  stock: z.number().min(0, 'Estoque não pode ser negativo'),
  is_active: z.boolean()
});

export const AdminMarketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalStockValue: 0,
    averageRating: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    image_url: '',
    category: '',
    stock: 0,
    is_active: true
  });

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('marketplace_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (productsData: Product[]) => {
    const totalProducts = productsData.length;
    const activeProducts = productsData.filter(p => p.is_active).length;
    const totalStockValue = productsData.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const averageRating = productsData.reduce((sum, p) => sum + p.average_rating, 0) / totalProducts || 0;

    setStats({
      totalProducts,
      activeProducts,
      totalStockValue,
      averageRating: parseFloat(averageRating.toFixed(1))
    });
  };

  // Filter products
  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        statusFilter === 'active' ? p.is_active : !p.is_active
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, categoryFilter, statusFilter]);

  // Real-time subscription
  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('marketplace-products-changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_products'
        },
        () => {
          console.log('🔄 Produtos atualizados em tempo real');
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const validatedData = productSchema.parse(formData);

      if (editingProduct) {
        // Update
        const { error } = await (supabase as any)
          .from('marketplace_products')
          .update(validatedData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado com sucesso!');
      } else {
        // Create
        const { error } = await (supabase as any)
          .from('marketplace_products')
          .insert(validatedData);

        if (error) throw error;
        toast.success('Produto criado com sucesso!');
      }

      setShowProductModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Erro ao salvar produto:', error);
        toast.error('Erro ao salvar produto');
      }
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      const { error } = await (supabase as any)
        .from('marketplace_products')
        .delete()
        .eq('id', deleteProduct.id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso!');
      setDeleteProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  // Toggle product status
  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await (supabase as any)
        .from('marketplace_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      toast.success(`Produto ${!product.is_active ? 'ativado' : 'desativado'} com sucesso!`);
      fetchProducts();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do produto');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      image_url: '',
      category: '',
      stock: 0,
      is_active: true
    });
    setEditingProduct(null);
  };

  // Open edit modal
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      is_active: product.is_active
    });
    setShowProductModal(true);
  };

  // Open create modal
  const openCreateModal = () => {
    resetForm();
    setShowProductModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="!bg-gradient-to-br !from-blue-900 !to-blue-800 border-blue-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-blue-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card className="!bg-gradient-to-br !from-green-900 !to-green-800 border-green-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Produtos Ativos</CardTitle>
            <Eye className="h-4 w-4 text-green-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeProducts}</div>
          </CardContent>
        </Card>

        <Card className="!bg-gradient-to-br !from-yellow-900 !to-yellow-800 border-yellow-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Valor em Estoque</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              R$ {stats.totalStockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="!bg-gradient-to-br !from-purple-900 !to-purple-800 border-purple-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Avaliação Média</CardTitle>
            <Star className="h-4 w-4 text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">⭐ {stats.averageRating}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5" />
            Gerenciar Produtos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-950 border-gray-700 text-white"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-gray-950 border-gray-700 text-white">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-gray-950 border-gray-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={openCreateModal} className="whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="!bg-gradient-to-br !from-gray-800 !to-gray-900 overflow-hidden">
            <div className="relative h-48 w-full bg-gray-950">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <Badge 
                className={`absolute top-2 right-2 ${product.is_active ? 'bg-green-600' : 'bg-red-600'}`}
              >
                {product.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-white truncate">{product.name}</h3>
              <p className="text-sm text-gray-400 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-400 font-bold">
                  R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-gray-400">Est: {product.stock}</span>
              </div>

              <div className="flex items-center gap-1 text-yellow-400 text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span>{product.average_rating.toFixed(1)}</span>
                <span className="text-gray-500">({product.total_reviews})</span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(product)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleProductStatus(product)}
                  className="flex-1"
                >
                  {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteProduct(product)}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="!bg-gradient-to-br !from-gray-800 !to-gray-900">
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400 mb-4">Tente ajustar os filtros ou adicione um novo produto</p>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="name" className="text-white">Nome do Produto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Camisa Premium"
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o produto..."
                rows={4}
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-white">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>

              <div>
                <Label htmlFor="stock" className="text-white">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  placeholder="0"
                  className="bg-gray-950 border-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="image_url" className="text-white">URL da Imagem</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                placeholder="https://..."
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-white">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Ex: Roupas, Acessórios, etc."
                className="bg-gray-950 border-gray-700 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active" className="text-white cursor-pointer">
                Produto ativo (visível no marketplace)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingProduct ? 'Atualizar' : 'Criar'} Produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o produto "{deleteProduct?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
