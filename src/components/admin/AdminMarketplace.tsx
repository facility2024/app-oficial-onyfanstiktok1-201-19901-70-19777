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
import { Plus, Edit, Trash2, Eye, EyeOff, ShoppingCart, Package, DollarSign, Star, Search, Tag, ChevronDown, ChevronUp } from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  order_index: number;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoriesSection, setShowCategoriesSection] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  
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

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
    order_index: 0,
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

  // Fetch categories
  const fetchCategories = async () => {
    try {
      console.log('🏷️ Buscando categorias do Supabase...');
      
      const { data, error } = await (supabase as any)
        .from('marketplace_categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ Erro na query de categorias:', error);
        throw error;
      }

      console.log('✅ Categorias recebidas:', data?.length || 0, data);
      
      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhuma categoria encontrada no banco de dados');
        toast.warning('Nenhuma categoria cadastrada. Crie categorias na seção "Gerenciar Categorias" acima.');
      }

      setCategories(data || []);
    } catch (error: any) {
      console.error('❌ Erro ao buscar categorias:', error);
      
      // Erro específico: tabela não existe
      if (error?.code === '42P01') {
        console.error('❌ Tabela marketplace_categories não existe!');
        toast.error('Tabela de categorias não existe. Execute o SQL de criação no Supabase.');
      } 
      // Erro de permissão RLS
      else if (error?.code === '42501' || error?.message?.includes('permission denied')) {
        console.error('❌ Permissão negada para acessar categorias');
        toast.error('Erro de permissão. Verifique as políticas RLS da tabela marketplace_categories.');
      }
      // Erro genérico
      else {
        toast.error(`Erro ao carregar categorias: ${error?.message || 'Erro desconhecido'}`);
      }
      
      setCategories([]);
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
    fetchCategories();

    const productsChannel = supabase
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

    const categoriesChannel = supabase
      .channel('marketplace-categories-changes')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'marketplace_categories'
        },
        () => {
          console.log('🔄 Categorias atualizadas em tempo real');
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, []);

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

  // Handle delete product
  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      console.log('🗑️ Tentando deletar produto:', deleteProduct.id);
      
      const { data, error } = await (supabase as any)
        .from('marketplace_products')
        .delete()
        .eq('id', deleteProduct.id)
        .select();

      if (error) {
        console.error('❌ Erro Supabase ao deletar:', error);
        throw error;
      }

      console.log('✅ Produto deletado:', data);
      toast.success('Produto excluído com sucesso!');
      setDeleteProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('❌ Erro ao excluir produto:', error);
      toast.error(`Erro ao excluir: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  // Handle category submit
  const handleCategorySubmit = async () => {
    try {
      if (!categoryFormData.name.trim()) {
        toast.error('Nome da categoria é obrigatório');
        return;
      }

      if (editingCategory) {
        // Update
        const { error } = await (supabase as any)
          .from('marketplace_categories')
          .update(categoryFormData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso!');
      } else {
        // Create
        const { error } = await (supabase as any)
          .from('marketplace_categories')
          .insert(categoryFormData);

        if (error) throw error;
        toast.success('Categoria criada com sucesso!');
      }

      setShowCategoryModal(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Erro ao salvar categoria:', error);
      toast.error(`Erro ao salvar: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;

    try {
      const { error } = await (supabase as any)
        .from('marketplace_categories')
        .delete()
        .eq('id', deleteCategory.id);

      if (error) throw error;

      toast.success('Categoria excluída com sucesso!');
      setDeleteCategory(null);
      fetchCategories();
    } catch (error: any) {
      console.error('Erro ao excluir categoria:', error);
      toast.error(`Erro ao excluir: ${error?.message || 'Erro desconhecido'}`);
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

  // Reset category form
  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
      icon: '',
      order_index: categories.length,
      is_active: true
    });
    setEditingCategory(null);
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

  // Open edit category modal
  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      order_index: category.order_index,
      is_active: category.is_active
    });
    setShowCategoryModal(true);
  };

  // Open create category modal
  const openCreateCategoryModal = () => {
    resetCategoryForm();
    setShowCategoryModal(true);
  };

  // Get product count by category
  const getProductCountByCategory = (categoryName: string) => {
    return products.filter(p => p.category === categoryName).length;
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
      {/* GERENCIAR CATEGORIAS */}
      <Card className="!bg-gradient-to-br !from-purple-900 !to-purple-800 border-purple-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Tag className="w-5 h-5" />
              Gerenciar Categorias
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={openCreateCategoryModal}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCategoriesSection(!showCategoriesSection)}
                className="text-white hover:bg-purple-700"
              >
                {showCategoriesSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showCategoriesSection && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map((category) => (
                <Card key={category.id} className="!bg-purple-950/50 border-purple-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {category.icon && <span className="text-2xl">{category.icon}</span>}
                        <div>
                          <h4 className="font-semibold text-white">{category.name}</h4>
                          {category.description && (
                            <p className="text-xs text-gray-400">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={category.is_active ? 'bg-green-600' : 'bg-red-600'}>
                        {category.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      {getProductCountByCategory(category.name)} produtos
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCategoryModal(category)}
                        className="flex-1 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteCategory(category)}
                        className="flex-1 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {categories.length === 0 && (
              <div className="text-center py-8">
                <Tag className="w-12 h-12 mx-auto mb-3 text-purple-400" />
                <p className="text-white mb-2">Nenhuma categoria cadastrada</p>
                <Button onClick={openCreateCategoryModal} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Categoria
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

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
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.icon} {cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-gray-950 border-gray-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
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
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                  <SelectValue placeholder={
                    categories.length === 0 
                      ? "⚠️ Nenhuma categoria cadastrada" 
                      : "Selecione uma categoria"
                  } />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-white">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      <p className="text-sm">Nenhuma categoria encontrada</p>
                      <p className="text-xs mt-1">Crie categorias na seção acima</p>
                    </div>
                  ) : (
                    <>
                      {categories.filter(c => c.is_active).map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        ✏️ Outra (digite abaixo)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              
              {formData.category === '__custom__' && (
                <Input
                  placeholder="Digite o nome da categoria..."
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="mt-2 bg-gray-950 border-gray-700 text-white"
                />
              )}
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

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-lg bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cat_name" className="text-white">Nome da Categoria</Label>
              <Input
                id="cat_name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({...categoryFormData, name: e.target.value})}
                placeholder="Ex: Roupas, Eletrônicos..."
                className="bg-purple-950 border-purple-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="cat_description" className="text-white">Descrição (opcional)</Label>
              <Input
                id="cat_description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                placeholder="Breve descrição da categoria"
                className="bg-purple-950 border-purple-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="cat_icon" className="text-white">Ícone Emoji (opcional)</Label>
              <Input
                id="cat_icon"
                value={categoryFormData.icon}
                onChange={(e) => setCategoryFormData({...categoryFormData, icon: e.target.value})}
                placeholder="Ex: 👗 📱 💄"
                className="bg-purple-950 border-purple-700 text-white"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="cat_order" className="text-white">Ordem de Exibição</Label>
              <Input
                id="cat_order"
                type="number"
                value={categoryFormData.order_index}
                onChange={(e) => setCategoryFormData({...categoryFormData, order_index: parseInt(e.target.value) || 0})}
                className="bg-purple-950 border-purple-700 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cat_active"
                checked={categoryFormData.is_active}
                onChange={(e) => setCategoryFormData({...categoryFormData, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label htmlFor="cat_active" className="text-white cursor-pointer">
                Categoria ativa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCategorySubmit} className="bg-purple-600 hover:bg-purple-700">
              {editingCategory ? 'Atualizar' : 'Criar'} Categoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation */}
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

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão de Categoria</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir a categoria "{deleteCategory?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-purple-700 text-white hover:bg-purple-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
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
