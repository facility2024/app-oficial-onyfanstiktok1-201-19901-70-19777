import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X, Heart, Eye, Share2, User } from 'lucide-react';
import { toast } from 'sonner';

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissionModal = ({ isOpen, onClose }: MissionModalProps) => {
  const [formData, setFormData] = useState({
    likes: '',
    views: '',
    shares: '',
    profileVisits: '',
    monthlyActivations: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.likes || !formData.views || !formData.shares || !formData.profileVisits || !formData.monthlyActivations) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Simular envio
    toast.success('Missão diária top10 criada com sucesso!');
    
    // Reset form
    setFormData({
      likes: '',
      views: '',
      shares: '',
      profileVisits: '',
      monthlyActivations: ''
    });
    
    onClose();
  };

  const participationRules = [
    "Para participar da premiação top10:",
    "• Complete as ações diárias especificadas",
    "• Cada ação concluída gera pontos automáticos",
    "• Acumule pontos para subir no ranking",
    "• Prêmios são distribuídos semanalmente",
    "• Mantenha-se ativo para maximizar seus ganhos",
    "• Vítimas que mais pontuam ganham recompensas exclusivas"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">🎯 Nova Missão Diária Top10</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form Fields */}
          <Card className="p-6 bg-gradient-card border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Configurar Ações para Ganhar Pontos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="likes" className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-destructive" />
                  <span>Quantidade de Curtidas</span>
                </Label>
                <Input
                  id="likes"
                  type="number"
                  placeholder="Ex: 10"
                  value={formData.likes}
                  onChange={(e) => handleInputChange('likes', e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="views" className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span>Visualizações de Vídeos/Imagens</span>
                </Label>
                <Input
                  id="views"
                  type="number"
                  placeholder="Ex: 20"
                  value={formData.views}
                  onChange={(e) => handleInputChange('views', e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shares" className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4 text-success" />
                  <span>Compartilhamentos</span>
                </Label>
                <Input
                  id="shares"
                  type="number"
                  placeholder="Ex: 5"
                  value={formData.shares}
                  onChange={(e) => handleInputChange('shares', e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileVisits" className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-warning" />
                  <span>Visitas no Perfil</span>
                </Label>
                <Input
                  id="profileVisits"
                  type="number"
                  placeholder="Ex: 15"
                  value={formData.profileVisits}
                  onChange={(e) => handleInputChange('profileVisits', e.target.value)}
                  className="bg-background border-border"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="monthlyActivations">
                Quantas vezes no mês pode ser ativado para todos os usuários
              </Label>
              <Input
                id="monthlyActivations"
                type="number"
                placeholder="Ex: 30"
                value={formData.monthlyActivations}
                onChange={(e) => handleInputChange('monthlyActivations', e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </Card>

          {/* Participation Rules */}
          <Card className="p-6 bg-gradient-secondary border-border/50">
            <h3 className="text-lg font-semibold mb-4 text-foreground">📋 Regras de Participação</h3>
            <div className="space-y-2">
              {participationRules.map((rule, index) => (
                <p key={index} className={`text-sm ${index === 0 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {rule}
                </p>
              ))}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border hover:bg-muted"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-primary hover:shadow-glow text-primary-foreground"
            >
              Enviar para o Aplicativo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};