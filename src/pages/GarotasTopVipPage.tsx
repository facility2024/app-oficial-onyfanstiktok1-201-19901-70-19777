import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Página DEMO liberada após confirmação do PIX (Garotas Top 10 VIP)
// Pode ser trocada depois pela página real com todos os vídeos.
export default function GarotasTopVipPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const paid = localStorage.getItem("garotas_top_paid") === "1";
    setAllowed(paid);
  }, []);

  if (allowed === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
        <Lock className="w-16 h-16 text-fuchsia-400 mb-4" />
        <h1 className="text-2xl font-black bg-gradient-to-r from-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
          Conteúdo bloqueado
        </h1>
        <p className="mt-2 text-purple-200/80 max-w-md">
          Você precisa concluir o pagamento PIX para acessar todos os vídeos das
          Garotas Top 10.
        </p>
        <Button
          onClick={() => navigate("/app")}
          className="mt-6 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500"
        >
          Voltar e assinar
        </Button>
      </div>
    );
  }

  // ===== DEMO GALLERY =====
  const demoItems = Array.from({ length: 12 }).map((_, i) => ({
    id: `demo-${i}`,
    title: `Vídeo exclusivo #${i + 1}`,
  }));

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-700/30 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[120px]" />

      <div className="relative max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate("/app")}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-200 hover:bg-purple-800/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Voltar</span>
        </button>

        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-900/40 border border-fuchsia-500/40 mb-3">
            <Sparkles className="w-4 h-4 text-fuchsia-300" />
            <span className="text-xs uppercase tracking-widest text-fuchsia-200">
              Área VIP
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-fuchsia-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
            GAROTAS TOP 10 — VIP
          </h1>
          <p className="mt-2 text-purple-200/80">
            Página <b>DEMO</b> — substituível. Conecte aqui a lista real de
            vídeos.
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {demoItems.map((v) => (
            <div
              key={v.id}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-fuchsia-500/30 bg-gradient-to-br from-purple-950 to-black shadow-[0_0_20px_rgba(217,70,239,0.25)] hover:shadow-[0_0_40px_rgba(217,70,239,0.6)] transition-all"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-10 h-10 text-white/70 group-hover:scale-110 transition-transform" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-xs font-bold truncate">{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
