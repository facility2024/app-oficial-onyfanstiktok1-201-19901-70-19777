import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

const LojaProdutoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = Number(id);

  if (!productId || productId < 1 || productId > 30) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <p className="text-xl">Produto não encontrado</p>
          <Button onClick={() => navigate('/loja')} variant="outline" className="text-white border-white/20">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à Loja
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
    }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #7CB342 0%, #558B2F 35%, #C4842E 70%, #8B4513 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/loja')} className="text-white hover:text-white/80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={rainbowLogo} alt="CocoNudi" className="h-10 object-contain" />
        </div>
        <span className="text-white font-bold text-sm">Produto #{productId}</span>
      </header>

      {/* Conteúdo do Produto */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Imagem Principal */}
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <img
            src={`${CDN_BASE}/${productId}.jpg`}
            alt={`Produto ${productId}`}
            className="w-full object-cover"
            onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
          />
        </div>

        {/* Info */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">Produto {productId}</h1>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Package className="w-5 h-5" />
              <span className="font-semibold">Detalhes do Produto</span>
            </div>
            <p className="text-white/70 text-sm">
              Os detalhes e informações deste produto serão adicionados em breve. 
              Fique atento para novidades!
            </p>
          </div>

          {/* Placeholder para futuro conteúdo/compra */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <ShoppingBag className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-300 font-semibold text-sm">Em breve disponível para compra</p>
            <p className="text-white/50 text-xs mt-1">Estamos preparando tudo para você!</p>
          </div>
        </div>

        {/* Voltar */}
        <Button
          onClick={() => navigate('/loja')}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar à Loja
        </Button>
      </main>
    </div>
  );
};

export default LojaProdutoPage;
