import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Plus, Search, Star, Edit, Trash2, Power, PowerOff, Phone, Globe, ExternalLink } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface LocalBusiness {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  rating?: number;
  image_url?: string;
  is_active: boolean;
  is_sponsored: boolean;
  created_at: string;
}

const businessSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  category: z.string().min(2, 'Categoria é obrigatória'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  phone: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  google_maps_url: z.string().url('URL do Google Maps inválida').optional().or(z.literal('')),
  rating: z.number().min(0).max(5).optional(),
  image_url: z.string().url('URL inválida').optional().or(z.literal('')),
  is_active: z.boolean(),
  is_sponsored: z.boolean(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export const AdminLocalBusinesses = () => {
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSponsored, setFilterSponsored] = useState<'all' | 'yes' | 'no'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<LocalBusiness | null>(null);
  const { toast } = useToast();

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      address: '',
      phone: '',
      website: '',
      google_maps_url: '',
      rating: 5,
      image_url: '',
      is_active: true,
      is_sponsored: false,
    },
  });

  useEffect(() => {
    fetchBusinesses();
    setupRealtimeSubscription();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('local_businesses' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses((data as any) || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comércios locais',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('local_businesses_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'local_businesses' },
        () => {
          fetchBusinesses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const categories = Array.from(new Set(businesses.map(b => b.category))).sort();

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch =
      business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || business.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && business.is_active) ||
      (filterStatus === 'inactive' && !business.is_active);
    const matchesSponsored = filterSponsored === 'all' ||
      (filterSponsored === 'yes' && business.is_sponsored) ||
      (filterSponsored === 'no' && !business.is_sponsored);

    return matchesSearch && matchesCategory && matchesStatus && matchesSponsored;
  });

  const stats = {
    total: businesses.length,
    active: businesses.filter(b => b.is_active).length,
    avgRating: businesses.reduce((acc, b) => acc + (b.rating || 0), 0) / businesses.length || 0,
    sponsored: businesses.filter(b => b.is_sponsored).length,
  };

  const handleSubmit = async (data: BusinessFormData) => {
    try {
      if (editingBusiness) {
        const { error } = await supabase
          .from('local_businesses' as any)
          .update(data)
          .eq('id', editingBusiness.id);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Comércio atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('local_businesses' as any)
          .insert([data]);

        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Comércio adicionado com sucesso' });
      }

      setIsModalOpen(false);
      setEditingBusiness(null);
      form.reset();
      fetchBusinesses();
    } catch (error) {
      console.error('Error saving business:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar comércio',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (business: LocalBusiness) => {
    setEditingBusiness(business);
    form.reset({
      name: business.name,
      description: business.description,
      category: business.category,
      address: business.address,
      phone: business.phone || '',
      website: business.website || '',
      google_maps_url: business.google_maps_url || '',
      rating: business.rating,
      image_url: business.image_url || '',
      is_active: business.is_active,
      is_sponsored: business.is_sponsored,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este comércio?')) return;

    try {
      const { error } = await supabase
        .from('local_businesses' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Sucesso', description: 'Comércio deletado com sucesso' });
      fetchBusinesses();
    } catch (error) {
      console.error('Error deleting business:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao deletar comércio',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('local_businesses' as any)
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: `Comércio ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
      fetchBusinesses();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-600 text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Comércios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comércios Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avaliação Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)} ⭐</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Patrocinados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.sponsored}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Gerenciar Comércios Locais
            </CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingBusiness(null);
                    form.reset();
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Comércio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingBusiness ? 'Editar Comércio' : 'Adicionar Novo Comércio'}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Comércio</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Padaria Central" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Descrição do comércio..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Padaria" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rating"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Avaliação (0-5)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="5"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, número, bairro, cidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="google_maps_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Google Maps (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://www.google.com/maps/place/..."
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground mt-1">
                            Cole o link do Google Maps do estabelecimento para o botão "Como Chegar"
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98765-4321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://exemplo.com.br" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL da Imagem (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-6">
                      <FormField
                        control={form.control}
                        name="is_active"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Ativo</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="is_sponsored"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Patrocinado</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsModalOpen(false);
                          setEditingBusiness(null);
                          form.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingBusiness ? 'Atualizar' : 'Adicionar'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, endereço ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSponsored} onValueChange={(value: any) => setFilterSponsored(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Patrocinado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Patrocinados</SelectItem>
                <SelectItem value="no">Não Patrocinados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">Carregando comércios...</p>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum comércio encontrado</p>
          </div>
        ) : (
          filteredBusinesses.map((business) => (
            <Card key={business.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  {business.is_sponsored && (
                    <Badge className="bg-green-500 text-white">PATROCINADO</Badge>
                  )}
                  {business.is_active ? (
                    <Badge className="bg-green-600">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>

                {/* Image */}
                {business.image_url && (
                  <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                    <img
                      src={business.image_url}
                      alt={business.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                )}

                {/* Name and Category */}
                <div>
                  <h3 className="font-semibold text-lg">{business.name}</h3>
                  <p className="text-sm text-muted-foreground">{business.category}</p>
                </div>

                {/* Rating */}
                {renderStars(business.rating)}

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {business.description}
                </p>

                {/* Address */}
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{business.address}</span>
                </p>

                {/* Contact */}
                <div className="flex gap-2 text-xs">
                  {business.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {business.phone}
                    </span>
                  )}
                  {business.website && (
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      Site
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(business)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(business.id, business.is_active)}
                    className="flex-1"
                  >
                    {business.is_active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(business.id)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
