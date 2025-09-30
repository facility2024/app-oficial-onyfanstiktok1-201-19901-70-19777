import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContent: any;
}

export const OffersModal = ({ isOpen, onClose, selectedContent }: OffersModalProps) => {
  const [formData, setFormData] = useState({
    productName: '',
    productImage: '',
    backgroundColor: '#000000',
      backgroundTransparency: [90],
    buttonText: 'Comprar Agora',
    buttonLink: '',
    buttonColor: '#ffffff',
    presentationTime: [5],
    startDate: null as Date | null,
    endDate: null as Date | null,
    description: ''
  });

  const [showPreview, setShowPreview] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.productName || !formData.productImage || !formData.buttonLink) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Selecione as datas de início e fim');
      return;
    }

    // Simular envio da oferta
    toast.success(`Oferta "${formData.productName}" criada para ${selectedContent?.name}!`);
    onClose();
    
    // Reset form
    setFormData({
      productName: '',
      productImage: '',
      backgroundColor: '#000000',
      backgroundTransparency: [90],
      buttonText: 'Comprar Agora',
      buttonLink: '',
      buttonColor: '#ffffff',
      presentationTime: [5],
      startDate: null,
      endDate: null,
      description: ''
    });
  };

  const PreviewCard = () => (
    <div 
      className="fixed inset-0 z-[9999]"
      style={{
        backgroundImage: formData.productImage ? `url("${formData.productImage}")` : 'url("/lovable-uploads/41dbca56-0539-491b-a599-1fae357d5331.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay com a cor de fundo e transparência ajustável */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: formData.backgroundColor,
          opacity: formData.backgroundTransparency[0] / 100
        }}
      />
      
      <button 
        onClick={() => setShowPreview(false)}
        className="absolute top-4 right-4 p-3 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all hover:scale-110 z-20 border-2 border-white"
        title="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div className="text-center space-y-2 sm:space-y-4 bg-black/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 max-w-xs sm:max-w-md w-full border border-white/20">
          <h3 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-2xl">
            {formData.productName || 'Nome do Produto'}
          </h3>
          {formData.description && (
            <p className="text-white/90 text-base sm:text-lg drop-shadow-lg">
              {formData.description}
            </p>
          )}
        </div>
        
        {formData.buttonText && (
          <button 
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg shadow-2xl hover:scale-105 transition-all border-2 border-white/30"
            style={{ backgroundColor: formData.buttonColor, color: '#000000' }}
          >
            {formData.buttonText}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Criar Oferta VIP para {selectedContent?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Nome do Produto *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  placeholder="Digite o nome do produto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productImage">URL da Imagem (1080x1080px) *</Label>
                <Input
                  id="productImage"
                  value={formData.productImage}
                  onChange={(e) => handleInputChange('productImage', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição opcional do produto"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Transparência: {formData.backgroundTransparency[0]}%</Label>
                  <Slider
                    value={formData.backgroundTransparency}
                    onValueChange={(value) => handleInputChange('backgroundTransparency', value)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buttonText">Texto do Botão</Label>
                  <Input
                    id="buttonText"
                    value={formData.buttonText}
                    onChange={(e) => handleInputChange('buttonText', e.target.value)}
                    placeholder="Comprar Agora"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonColor">Cor do Botão</Label>
                  <div className="flex gap-2">
                    <Input
                      id="buttonColor"
                      type="color"
                      value={formData.buttonColor}
                      onChange={(e) => handleInputChange('buttonColor', e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.buttonColor}
                      onChange={(e) => handleInputChange('buttonColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buttonLink">Link do Botão *</Label>
                <Input
                  id="buttonLink"
                  value={formData.buttonLink}
                  onChange={(e) => handleInputChange('buttonLink', e.target.value)}
                  placeholder="https://exemplo.com/produto"
                />
              </div>

              <div className="space-y-2">
                <Label>Tempo de Apresentação: {formData.presentationTime[0]} segundos</Label>
                <Slider
                  value={formData.presentationTime}
                  onValueChange={(value) => handleInputChange('presentationTime', value)}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate ? format(formData.startDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.startDate}
                        onSelect={(date) => handleInputChange('startDate', date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Data de Fim *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate ? format(formData.endDate, "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.endDate}
                        onSelect={(date) => handleInputChange('endDate', date)}
                        initialFocus
                        disabled={(date) => formData.startDate ? date < formData.startDate : false}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowPreview(true)}
                  variant="outline" 
                  className="flex-1"
                  disabled={!formData.productName || !formData.productImage}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="flex-1 bg-gradient-primary"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Oferta
                </Button>
              </div>
            </div>

            {/* Preview Lateral */}
            <div className="lg:sticky lg:top-4 space-y-4">
              <h3 className="font-semibold text-lg">Preview do Card</h3>
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 min-h-[400px] flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg max-w-[280px] w-full p-4 space-y-3">
                  {formData.productImage ? (
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-gray-200">
                      <img 
                        src={formData.productImage} 
                        alt={formData.productName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" fill="%23374151" font-size="12">1080x1080</text></svg>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full rounded-lg bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Imagem do Produto</span>
                    </div>
                  )}
                  
                  <div className="text-center space-y-2">
                    <h4 className="font-semibold text-gray-900">
                      {formData.productName || 'Nome do Produto'}
                    </h4>
                    {formData.description && (
                      <p className="text-gray-600 text-xs">{formData.description}</p>
                    )}
                  </div>
                  
                  <button 
                    className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-all"
                    style={{ backgroundColor: formData.buttonColor, color: '#000000' }}
                  >
                    {formData.buttonText}
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Duração:</strong> {formData.presentationTime[0]}s</p>
                <p><strong>Período:</strong> {
                  formData.startDate && formData.endDate 
                    ? `${format(formData.startDate, "dd/MM/yyyy")} - ${format(formData.endDate, "dd/MM/yyyy")}`
                    : 'Selecione as datas'
                }</p>
                <p><strong>Transparência:</strong> {formData.backgroundTransparency[0]}%</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview em Tela Cheia */}
      {showPreview && <PreviewCard />}
    </>
  );
};