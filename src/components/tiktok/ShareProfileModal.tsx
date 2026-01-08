import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  avatarUrl?: string;
}

export const ShareProfileModal = ({ isOpen, onClose, username, avatarUrl }: ShareProfileModalProps) => {
  const [copied, setCopied] = useState(false);
  
  // Gerar URL amigável
  const formattedUsername = (username || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const shareUrl = `https://coconudi.com/${formattedUsername}`;
  
  // Copiar URL
  const copyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Download QR Code
  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `coconudi-${formattedUsername}.png`;
    link.href = url;
    link.click();
    toast.success('QR Code salvo!');
  };
  
  // Compartilhar via Web Share API
  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${username} no Coconudi`,
          text: `Confira o perfil de @${username} no Coconudi! 🔥`,
          url: shareUrl
        });
      } catch {
        // User cancelled or error
      }
    }
  };
  
  // Compartilhar WhatsApp
  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Confira o perfil de @${username} no Coconudi! 🔥 ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  
  // Compartilhar Telegram
  const shareTelegram = () => {
    const text = encodeURIComponent(`Confira o perfil de @${username} no Coconudi! 🔥`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-zinc-900 to-black border-white/10 max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center pb-2">
          <h2 className="text-white text-xl font-bold">Compartilhar Perfil</h2>
          <p className="text-white/60 text-sm">@{username}</p>
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center p-4">
          <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <QRCodeCanvas
              id="qr-code-canvas"
              value={shareUrl}
              size={180}
              level="H"
              includeMargin={false}
              imageSettings={avatarUrl ? {
                src: avatarUrl,
                height: 36,
                width: 36,
                excavate: true,
              } : undefined}
            />
          </div>
        </div>
        
        {/* URL */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
          <span className="text-white/70 text-sm flex-1 truncate">{shareUrl}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyUrl}
            className="text-white hover:bg-white/10 shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            onClick={downloadQRCode}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar QR
          </Button>
          
          {navigator.share ? (
            <Button onClick={shareNative} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          ) : (
            <Button onClick={shareWhatsApp} variant="outline" className="border-green-500/30 text-white bg-green-600/20 hover:bg-green-600/30">
              WhatsApp
            </Button>
          )}
        </div>
        
        {/* Links rápidos */}
        <div className="flex justify-center gap-4 pt-1">
          <button onClick={shareWhatsApp} className="text-green-500 hover:text-green-400 text-xs transition-colors">
            WhatsApp
          </button>
          <span className="text-white/30">•</span>
          <button onClick={shareTelegram} className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
            Telegram
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
