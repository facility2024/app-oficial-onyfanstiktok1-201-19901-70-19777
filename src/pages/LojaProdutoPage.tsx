import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, ThumbsUp, Share2, MessageCircle, ShoppingBag, Package, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import rainbowLogo from '@/assets/coconudi-rainbow-logo.png';

const CDN_BASE = 'https://tiktokonyfans.b-cdn.net/material%20coconudi/CAPAS%20SITE%20EXCLUSIVO';

// Placeholder para vídeos — será preenchido depois com URLs reais do Bunny CDN
const productVideos: Record<number, string | null> = {};

// Simula múltiplos vídeos por produto (thumbnails minimalistas)
const getProductVideoList = (productId: number) => {
  const videos = productVideos[productId];
  if (!videos) return [];
  return [{ id: 1, url: videos, title: `Vídeo ${productId}` }];
};

const LojaProdutoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productId = Number(id);
  const fileName = productId < 10 ? `0${productId}` : `${productId}`;
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

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
  const posterImg = `${CDN_BASE}/${fileName}.jpg`;

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

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Imagem principal do produto */}
        <div className="rounded-xl overflow-hidden border border-white/10">
          <img
            src={posterImg}
            alt={`Produto ${productId}`}
            className="w-full object-cover"
            onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
          />
        </div>

        {/* Título + info */}
        <div>
          <h1 className="text-lg font-bold text-white">Produto {productId} — CocoNudi Exclusive</h1>
          <p className="text-white/50 text-xs mt-1">Publicado recentemente</p>
        </div>

        {/* Canal */}
        <div className="flex items-center gap-3 py-3 border-y border-white/10">
          <img src={rainbowLogo} alt="CocoNudi" className="w-9 h-9 rounded-full object-contain bg-white/10 p-1" />
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">CocoNudi Official</p>
            <p className="text-white/50 text-xs">Loja Exclusiva</p>
          </div>
        </div>

        {/* Grid de vídeos minimalistas */}
        <div>
          <p className="text-white/80 text-sm font-semibold mb-3">Vídeos do Produto</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Thumbnail de vídeo — minimalista */}
            {videoUrl ? (
              <button
                onClick={() => setActiveVideo(videoUrl)}
                className="group relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 hover:border-amber-400/50 transition-all"
              >
                <img src={posterImg} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center border border-white/20 group-hover:bg-red-600 transition-colors">
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">0:00</span>
              </button>
            ) : (
              /* Placeholder quando não há vídeo ainda */
              <div className="relative aspect-video rounded-lg overflow-hidden border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white/40 ml-0.5" />
                </div>
                <span className="text-white/30 text-[10px]">Em breve</span>
              </div>
            )}
          </div>
        </div>

        {/* Descrição */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Package className="w-4 h-4" />
            <span className="font-semibold text-sm">Detalhes do Produto</span>
          </div>
          <p className="text-white/70 text-sm">
            Os detalhes e informações deste produto serão adicionados em breve.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <ShoppingBag className="w-7 h-7 text-amber-400 mx-auto mb-1.5" />
          <p className="text-amber-300 font-semibold text-sm">Em breve disponível para compra</p>
          <p className="text-white/50 text-xs mt-1">Estamos preparando tudo para você!</p>
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

      {/* ===== POP-UP de vídeo estilo YouTube ===== */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão fechar */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Player 16:9 */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
              <video
                src={activeVideo}
                controls
                autoPlay
                className="w-full h-full object-contain"
                poster={posterImg}
                playsInline
              />
            </div>

            {/* Info abaixo do vídeo no pop-up */}
            <div className="mt-3 px-1">
              <h2 className="text-white font-bold text-base">Produto {productId}</h2>
              <div className="flex items-center gap-3 mt-2">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default LojaProdutoPage;
