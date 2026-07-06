import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, Copy, CheckCircle2, QrCode } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  amount?: number;
  productName?: string;
  storageFlag?: string; // localStorage key liberado ao confirmar
  redirectTo?: string;  // rota liberada após pagamento
}

export default function PixCheckoutModal({
  open,
  onClose,
  amount = 14.97,
  productName = "Assinatura Garotas Top 10",
  storageFlag = "garotas_top_paid",
  redirectTo = "/garotas-top-vip",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{
    transaction_id?: string;
    pix_code?: string;
    pix_image?: string;
  } | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setPix(null);
    setQrImage(null);
    setPaid(false);
    setCopied(false);
    generate();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("neonpay-pix-gateway", {
        body: { amount, product_name: productName },
      });
      if (error) throw error;
      if (!data?.pix_code) throw new Error("PIX não retornado");
      setPix(data);
      await buildQrImage(String(data.pix_code), data.pix_image);
      startPolling(data.transaction_id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tente novamente em instantes.";
      toast({
        title: "Erro ao gerar PIX",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildQrImage = async (pixCode: string, apiImage?: string) => {
    if (apiImage) {
      const normalizedImage = apiImage.startsWith("data:image")
        ? apiImage
        : `data:image/png;base64,${apiImage}`;
      setQrImage(normalizedImage);
      return;
    }

    const generatedImage = await QRCode.toDataURL(pixCode, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 256,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    setQrImage(generatedImage);
  };

  const startPolling = (transactionId?: string) => {
    if (!transactionId) return;
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(
          `https://tnzvhwapfhkhqjgyiomk.supabase.co/functions/v1/neonpay-pix-status?transactionId=${encodeURIComponent(transactionId)}`,
          {
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        const json = await res.json().catch(() => ({}));
        const status = String(json?.status || "").toUpperCase();
        if (["OK", "PAID", "APPROVED", "CONFIRMED", "COMPLETED"].includes(status)) {
          handleConfirmed();
        }
      } catch {
        /* silencioso */
      }
    }, 4000) as unknown as number;
  };

  const handleConfirmed = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    setPaid(true);
    try {
      localStorage.setItem(storageFlag, "1");
    } catch (error) {
      void error;
    }
    toast({ title: "Pagamento confirmado!", description: "Liberando conteúdo..." });
    setTimeout(() => {
      onClose();
      window.location.href = redirectTo;
    }, 1200);
  };

  const copy = async () => {
    if (!pix?.pix_code) return;
    try {
      await navigator.clipboard.writeText(pix.pix_code);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-purple-950 to-black border border-fuchsia-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(217,70,239,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black/70 border border-fuchsia-500/40 text-white hover:bg-fuchsia-800/70"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-900/40 border border-fuchsia-500/40 mb-3">
            <QrCode className="w-4 h-4 text-fuchsia-300" />
            <span className="text-[10px] uppercase tracking-widest text-fuchsia-200">
              Pagamento PIX
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{productName}</h2>
          <p className="text-2xl font-black text-yellow-300 mt-1">
            R$ {amount.toFixed(2).replace(".", ",")}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-fuchsia-400" />
          </div>
        )}

        {!loading && paid && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
            <p className="mt-3 text-lg font-bold text-green-300">
              Pagamento confirmado!
            </p>
            <p className="text-sm text-purple-200/80">Liberando conteúdo...</p>
          </div>
        )}

        {!loading && !paid && pix?.pix_code && (
          <div className="mt-5 space-y-4">
            {qrImage ? (
              <div className="bg-white p-3 rounded-xl flex justify-center">
                <img
                  src={qrImage}
                  alt="QR Code PIX"
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : null}

            <div>
              <label className="text-xs uppercase tracking-widest text-fuchsia-200 font-bold">
                Código copia e cola
              </label>
              <textarea
                readOnly
                value={pix.pix_code}
                className="w-full mt-1 h-24 rounded-lg bg-black/60 border border-fuchsia-500/40 text-white text-xs p-2 font-mono resize-none"
              />
            </div>

            <Button
              onClick={copy}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold py-6 shadow-[0_0_30px_rgba(217,70,239,0.6)]"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" /> Copiar código PIX
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-purple-200/70 leading-relaxed">
              Abra o app do seu banco, escolha PIX › <b>Copia e Cola</b>, cole o
              código e confirme. Assim que o pagamento cair, seu acesso é
              liberado automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
