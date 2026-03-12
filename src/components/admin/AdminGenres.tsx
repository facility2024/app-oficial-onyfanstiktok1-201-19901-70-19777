import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tags, CheckCircle, XCircle, Film, ArrowUp, ArrowDown } from 'lucide-react';

interface Genre {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  video_count?: number;
}

interface GenreFormData {
  name: string;
  icon: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const defaultFormData: GenreFormData = {
  name: '',
  icon: '🎬',
  description: '',
  display_order: 0,
  is_active: true,
};

const emojiOptions = ['🎬', '💪', '✨', '🔥', '💃', '👗', '💄', '😂', '🎵', '🎭', '💕', '🌟', '🎯', '🏋️', '🧘', '🎨'];

export const AdminGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [formData, setFormData] = useState<GenreFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      setLoading(true);
      
      // Fetch genres (using any cast since table may not be in generated types yet)
      const { data: genresData, error: genresError } = await (supabase as any)
        .from('video_genres')
        .select('*')
        .order('display_order', { ascending: true });

      if (genresError) throw genresError;

      // Fetch video counts per genre
      const { data: videosData } = await (supabase as any)
        .from('videos')
        .select('genres');

      // Count videos per genre
      const genreCounts: Record<string, number> = {};
      videosData?.forEach((video: any) => {
        if (video.genres && Array.isArray(video.genres)) {
          video.genres.forEach((genreName: string) => {
            genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
          });
        }
      });

      // Merge counts with genres
      const genresWithCounts = (genresData || []).map((genre: any) => ({
        ...genre,
        video_count: genreCounts[genre.name] || 0,
      })) as Genre[];

      setGenres(genresWithCounts);
    } catch (error) {
      console.error('Error fetching genres:', error);
      toast.error('Erro ao carregar gêneros');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (genre?: Genre) => {
    if (genre) {
      setSelectedGenre(genre);
      setFormData({
        name: genre.name,
        icon: genre.icon || '🎬',
        description: genre.description || '',
        display_order: genre.display_order,
        is_active: genre.is_active,
      });
    } else {
      setSelectedGenre(null);
      setFormData({
        ...defaultFormData,
        display_order: genres.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGenre(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do gênero é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (selectedGenre) {
        // Update
        const { error } = await (supabase as any)
          .from('video_genres')
          .update({
            name: formData.name.trim(),
            icon: formData.icon,
            description: formData.description.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
          })
          .eq('id', selectedGenre.id);

        if (error) throw error;
        toast.success('Gênero atualizado com sucesso!');
      } else {
        // Create
        const { error } = await (supabase as any)
          .from('video_genres')
          .insert({
            name: formData.name.trim(),
            icon: formData.icon,
            description: formData.description.trim() || null,
            display_order: formData.display_order,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Gênero criado com sucesso!');
      }

      handleCloseModal();
      fetchGenres();
    } catch (error: any) {
      console.error('Error saving genre:', error);
      if (error.code === '23505') {
        toast.error('Já existe um gênero com este nome');
      } else {
        toast.error('Erro ao salvar gênero');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (genre: Genre) => {
    try {
      const { error } = await (supabase as any)
        .from('video_genres')
        .update({ is_active: !genre.is_active })
        .eq('id', genre.id);

      if (error) throw error;
      
      toast.success(genre.is_active ? 'Gênero desativado' : 'Gênero ativado');
      fetchGenres();
    } catch (error) {
      console.error('Error toggling genre:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!selectedGenre) return;

    try {
      const { error } = await (supabase as any)
        .from('video_genres')
        .delete()
        .eq('id', selectedGenre.id);

      if (error) throw error;

      toast.success('Gênero excluído com sucesso!');
      setIsDeleteDialogOpen(false);
      setSelectedGenre(null);
      fetchGenres();
    } catch (error) {
      console.error('Error deleting genre:', error);
      toast.error('Erro ao excluir gênero');
    }
  };

  const handleMoveOrder = async (genre: Genre, direction: 'up' | 'down') => {
    const currentIndex = genres.findIndex(g => g.id === genre.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= genres.length) return;

    const otherGenre = genres[newIndex];
    
    try {
      // Swap display_order values
      await Promise.all([
        (supabase as any)
          .from('video_genres')
          .update({ display_order: otherGenre.display_order })
          .eq('id', genre.id),
        (supabase as any)
          .from('video_genres')
          .update({ display_order: genre.display_order })
          .eq('id', otherGenre.id),
      ]);

      fetchGenres();
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Erro ao reordenar');
    }
  };

  const stats = {
    total: genres.length,
    active: genres.filter(g => g.is_active).length,
    inactive: genres.filter(g => !g.is_active).length,
    totalVideos: genres.reduce((acc, g) => acc + (g.video_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-white">Gerenciar Gêneros</h1>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Gênero
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Tags className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-sm text-gray-400">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.inactive}</p>
                <p className="text-sm text-gray-400">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900/50 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalVideos}</p>
                <p className="text-sm text-gray-400">Vídeos Categorizados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-gray-900/50 border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-gray-400">Ordem</TableHead>
                <TableHead className="text-gray-400">Ícone</TableHead>
                <TableHead className="text-gray-400">Nome</TableHead>
                <TableHead className="text-gray-400">Descrição</TableHead>
                <TableHead className="text-gray-400">Vídeos</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {genres.map((genre, index) => (
                <TableRow key={genre.id} className="border-white/10 hover:bg-white/5">
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(genre, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <span className="text-white w-4 text-center">{genre.display_order}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(genre, 'down')}
                        disabled={index === genres.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-2xl">{genre.icon}</span>
                  </TableCell>
                  <TableCell className="text-white font-medium">{genre.name}</TableCell>
                  <TableCell className="text-gray-400 max-w-xs truncate">
                    {genre.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                      {genre.video_count || 0} vídeos
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={genre.is_active}
                      onCheckedChange={() => handleToggleActive(genre)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(genre)}
                        className="hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4 text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedGenre(genre);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="hover:bg-white/10"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              
              {genres.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                    Nenhum gênero cadastrado. Clique em "Novo Gênero" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {selectedGenre ? 'Editar Gênero' : 'Novo Gênero'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                    className={`text-2xl p-2 rounded-lg transition-colors ${
                      formData.icon === emoji
                        ? 'bg-primary/30 ring-2 ring-primary'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Fitness, Lifestyle, Dança..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional do gênero..."
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order">Ordem de Exibição</Label>
              <Input
                id="order"
                type="number"
                min={0}
                value={formData.display_order}
                onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} className="border-gray-700">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : selectedGenre ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Gênero</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o gênero "{selectedGenre?.name}"?
              {(selectedGenre?.video_count || 0) > 0 && (
                <span className="block mt-2 text-yellow-400">
                  ⚠️ Este gênero está associado a {selectedGenre?.video_count} vídeo(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-white hover:bg-gray-800">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
