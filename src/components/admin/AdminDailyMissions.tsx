import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trophy, Target, Clock, Star, Users, TrendingUp } from 'lucide-react';

const missionFormSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  action_type: z.enum(['like', 'comment', 'share', 'view', 'message', 'custom']),
  target_count: z.number().min(1, 'Meta deve ser maior que 0'),
  points_reward: z.number().min(1, 'Pontos devem ser maior que 0'),
  icon: z.string().default('🎯'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string().default('engagement'),
  reward_description: z.string().optional(),
  time_limit_hours: z.number().optional(),
  is_active: z.boolean().default(true)
});

type MissionFormData = z.infer<typeof missionFormSchema>;

interface Mission {
  id: string;
  title: string;
  description: string;
  action_type: string;
  target_count: number;
  points_reward: number;
  icon: string;
  difficulty: string;
  category: string;
  reward_description: string;
  is_active: boolean;
  created_at: string;
}

interface DailyStats {
  totalUsers: number;
  totalPointsToday: number;
  completedMissions: number;
  activeMissions: number;
}

export const AdminDailyMissions = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalUsers: 0,
    totalPointsToday: 0,
    completedMissions: 0,
    activeMissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const form = useForm<MissionFormData>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      action_type: 'like',
      target_count: 1,
      points_reward: 10,
      icon: '🎯',
      difficulty: 'easy',
      category: 'engagement',
      is_active: true
    }
  });

  useEffect(() => {
    fetchMissions();
    fetchDailyStats();
  }, []);

  const fetchMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_missions')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error fetching missions:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as missões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('gamification_users')
        .select('*', { count: 'exact', head: true });

      // Get today's completed missions and points
      const today = new Date().toISOString().split('T')[0];
      const { data: completedToday, error: completedError } = await supabase
        .from('user_mission_progress')
        .select('points_earned')
        .eq('date_started', today)
        .eq('is_completed', true);

      if (completedError) throw completedError;

      const totalPointsToday = completedToday?.reduce((sum, item) => sum + (item.points_earned || 0), 0) || 0;
      const completedMissions = completedToday?.length || 0;

      // Get active missions count
      const { count: activeMissions } = await supabase
        .from('daily_missions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setDailyStats({
        totalUsers: totalUsers || 0,
        totalPointsToday,
        completedMissions,
        activeMissions: activeMissions || 0
      });
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  const onSubmit = async (data: MissionFormData) => {
    try {
      if (editingMission) {
        const { error } = await supabase
          .from('daily_missions')
          .update(data)
          .eq('id', editingMission.id);

        if (error) throw error;
        toast({
          title: "Sucesso!",
          description: "Missão atualizada com sucesso"
        });
      } else {
        const { error } = await supabase
          .from('daily_missions')
          .insert(data as any);

        if (error) throw error;
        toast({
          title: "Sucesso!",
          description: "Nova missão criada com sucesso"
        });
      }

      setIsDialogOpen(false);
      setEditingMission(null);
      form.reset();
      fetchMissions();
      fetchDailyStats();
    } catch (error) {
      console.error('Error saving mission:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a missão",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (mission: Mission) => {
    setEditingMission(mission);
    form.reset({
      title: mission.title,
      description: mission.description || '',
      action_type: mission.action_type as any,
      target_count: mission.target_count,
      points_reward: mission.points_reward,
      icon: mission.icon,
      difficulty: mission.difficulty as any,
      category: mission.category,
      reward_description: mission.reward_description || '',
      is_active: mission.is_active
    });
    setIsDialogOpen(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'hard': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels = {
      like: 'Curtir',
      comment: 'Comentar',
      share: 'Compartilhar',
      view: 'Assistir',
      message: 'Mensagem',
      custom: 'Personalizada'
    };
    return labels[actionType as keyof typeof labels] || actionType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Carregando missões...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
                <p className="text-xl font-bold text-foreground">{dailyStats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Star className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pontos Hoje</p>
                <p className="text-xl font-bold text-foreground">{dailyStats.totalPointsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missões Concluídas</p>
                <p className="text-xl font-bold text-foreground">{dailyStats.completedMissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missões Ativas</p>
                <p className="text-xl font-bold text-foreground">{dailyStats.activeMissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingMission(null);
              form.reset();
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Missão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMission ? 'Editar Missão' : 'Nova Missão Diária'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Curtir 10 vídeos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ícone</FormLabel>
                        <FormControl>
                          <Input placeholder="🎯" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva a missão..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="action_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Ação</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="like">Curtir</SelectItem>
                            <SelectItem value="comment">Comentar</SelectItem>
                            <SelectItem value="share">Compartilhar</SelectItem>
                            <SelectItem value="view">Assistir</SelectItem>
                            <SelectItem value="message">Mensagem</SelectItem>
                            <SelectItem value="custom">Personalizada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="points_reward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pontos</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dificuldade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Fácil</SelectItem>
                            <SelectItem value="medium">Médio</SelectItem>
                            <SelectItem value="hard">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="engagement" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reward_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição da Recompensa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ganhe 50 pontos por completar esta missão" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Missão Ativa</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Esta missão estará disponível para os usuários
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingMission ? 'Atualizar' : 'Criar'} Missão
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              📋 Regras de Participação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>📋 Regras de Participação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <p>Para participar da premiação top10:</p>
              <ul className="space-y-2">
                <li>• Complete as ações diárias especificadas</li>
                <li>• Cada ação concluída gera pontos automáticos</li>
                <li>• Acumule pontos para subir no ranking</li>
                <li>• Prêmios são distribuídos semanalmente</li>
                <li>• Mantenha-se ativo para maximizar seus ganhos</li>
                <li>• Usuários que mais pontuam ganham recompensas exclusivas</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Missions List */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-primary" />
            <span>🎯 Missões Diárias Ativas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <div 
                key={mission.id} 
                className="p-4 border border-border rounded-lg hover:bg-card-hover transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{mission.icon}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{mission.title}</h3>
                      <p className="text-sm text-muted-foreground">{mission.description}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleEdit(mission)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Badge className={getDifficultyColor(mission.difficulty)}>
                      {mission.difficulty === 'easy' ? 'Fácil' : mission.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                    </Badge>
                    <Badge variant="outline">
                      {getActionTypeLabel(mission.action_type)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {mission.target_count}x = {mission.points_reward} pts
                    </p>
                    <Badge variant={mission.is_active ? "default" : "secondary"}>
                      {mission.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>

                {mission.reward_description && (
                  <p className="text-xs text-muted-foreground italic">
                    {mission.reward_description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};