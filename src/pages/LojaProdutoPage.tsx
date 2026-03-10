import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ThumbsUp, Share2, MessageCircle, ShoppingBag, Package, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

// Placeholder para vídeos — será preenchido depois com URLs reais do Bunny CDN
const productVideos: Record<number, string | null> = {};

const LojaProdutoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = Number(id);
  const fileName = productId < 10 ? `0${productId}` : `${productId}`;

  if (!productId || productId < 1 || productId > 29) {
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

  const videoUrl = productVideos[productId] || null;

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

      {/* Layout estilo YouTube */}
      <div className="max-w-5xl mx-auto">
        {/* Video Player Area - 16:9 */}
        <div className="w-full bg-black">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full aspect-video object-contain bg-black"
              poster={`${CDN_BASE}/${fileName}.jpg`}
              preload="metadata"
              playsInline
            />
          ) : (
            <div className="w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden">
              <img
                src={`${CDN_BASE}/${fileName}.jpg`}
                alt={`Produto ${productId}`}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <p className="text-white/70 text-sm font-medium">Vídeo em breve</p>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo abaixo do vídeo - Estilo YouTube */}
        <div className="px-4 py-4 space-y-4">
          {/* Título */}
          <h1 className="text-lg md:text-xl font-bold text-white leading-tight">
            Produto {productId} — CocoNudi Exclusive
          </h1>

          {/* Stats bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3 text-white/50 text-xs">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> —
              </span>
              <span>Publicado recentemente</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs">
                <ThumbsUp className="w-4 h-4" /> Curtir
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs">
                <Share2 className="w-4 h-4" /> Compartilhar
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5 text-xs">
                <MessageCircle className="w-4 h-4" /> Comentar
              </Button>
            </div>
          </div>

          {/* Canal / Autor - Estilo YouTube */}
          <div className="flex items-center gap-3 py-3 border-b border-white/10">
            <img
              src={rainbowLogo}
              alt="CocoNudi"
              className="w-10 h-10 rounded-full object-contain bg-white/10 p-1"
            />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">CocoNudi Official</p>
              <p className="text-white/50 text-xs">Loja Exclusiva</p>
            </div>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 rounded-full"
            >
              Seguir
            </Button>
          </div>

          {/* Descrição */}
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Package className="w-4 h-4" />
              <span className="font-semibold text-sm">Detalhes do Produto</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              Os detalhes e informações deste produto serão adicionados em breve.
              Fique atento para novidades!
            </p>
          </div>

          {/* CTA Compra */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <ShoppingBag className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-300 font-semibold text-sm">Em breve disponível para compra</p>
            <p className="text-white/50 text-xs mt-1">Estamos preparando tudo para você!</p>
          </div>

          {/* Imagem do produto */}
          <div className="rounded-xl overflow-hidden border border-white/10">
            <img
              src={`${CDN_BASE}/${fileName}.jpg`}
              alt={`Produto ${productId}`}
              className="w-full object-cover"
              onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
            />
          </div>

          {/* Voltar */}
          <Button
            onClick={() => navigate('/loja')}
            variant="outline"
            className="w-full border-white/20 text-white hover:bg-white/10 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar à Loja
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LojaProdutoPage;
