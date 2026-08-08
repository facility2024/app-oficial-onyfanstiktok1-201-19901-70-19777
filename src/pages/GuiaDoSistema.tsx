import { useEffect } from "react";
import {
  BookOpen,
  Sparkles,
  ShoppingCart,
  Megaphone,
  CreditCard,
  Package,
  Calendar,
  Radio,
  Instagram,
  Users,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Paleta da marca
const BRAND = {
  purple: "#7c3aed",
  purpleDark: "#4c1d95",
  green: "#7CB342",
  amber: "#f59e0b",
  bg: "#0a0a0a",
};

interface Chapter {
  id: string;
  num: number;
  title: string;
  icon: any;
  color: string;
  intro: string;
  sections: { title: string; body: string | string[] }[];
}

const CHAPTERS: Chapter[] = [
  {
    id: "feed-ofertas",
    num: 1,
    title: "Feed de Ofertas",
    icon: Sparkles,
    color: BRAND.purple,
    intro:
      "O Feed de Ofertas é a vitrine dinâmica exibida dentro do app para destacar promoções, modelos e categorias VIP.",
    sections: [
      {
        title: "Acesso no Admin",
        body: "Painel Admin → Negócios → Feed de Ofertas (ads-garotas-top).",
      },
      {
        title: "Como cadastrar",
        body: [
          "Clique em '+ Novo card' e informe URL do vídeo (Bunny/CDN), título, categoria (Garotas Top, Latinas, Novidades) e preço PIX.",
          "Use 'Cadastro em massa' para colar várias URLs Bunny de uma vez — o sistema cria um card por linha.",
          "Ative 'Aplicar este link em todos os cards' para replicar o mesmo checkout em todos os itens.",
        ],
      },
      {
        title: "Boas práticas",
        body: [
          "Use thumbnails leves — vídeos do grid ficam estáticos com botão Play.",
          "Mantenha até 30 cards ativos por categoria para performance mobile.",
        ],
      },
    ],
  },
  {
    id: "order-bumps",
    num: 2,
    title: "Order Bumps",
    icon: ShoppingCart,
    color: "#ec4899",
    intro:
      "Order Bumps são ofertas adicionais oferecidas dentro do checkout para aumentar o ticket médio.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Negócios → Order Bumps (Checkout).",
      },
      {
        title: "Criação",
        body: [
          "Vincule o bump a um template de checkout específico (ou a todos).",
          "Defina título, imagem, preço adicional e produto liberado.",
          "O trigger 'sync_bump_to_product' atualiza o preço no Catálogo automaticamente.",
        ],
      },
      {
        title: "Exibição",
        body: "O bump aparece na página /checkout/:slug como checkbox opcional antes da geração do PIX.",
      },
    ],
  },
  {
    id: "promos",
    num: 3,
    title: "Promos no Feed",
    icon: Megaphone,
    color: BRAND.amber,
    intro:
      "Cards promocionais injetados no feed principal do TikTok em posições estratégicas.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Negócios → Promos no Feed (feed-promotions).",
      },
      {
        title: "Como funciona",
        body: [
          "Distribuição round-robin FIFO — nunca repete cards seguidos.",
          "Espaçamento dinâmico entre anúncios respeitando prioridade.",
          "Clique abre popup modal com CTA (não redireciona diretamente).",
          "Todo clique é rastreado em promo_click_tracking com geodata.",
        ],
      },
    ],
  },
  {
    id: "checkout-pix",
    num: 4,
    title: "Checkout PIX",
    icon: CreditCard,
    color: BRAND.green,
    intro:
      "Sistema transparente de pagamento via PIX com confirmação em tempo real via webhook NeonPay.",
    sections: [
      {
        title: "Templates",
        body: "Painel Admin → Financeiro → Página de Checkout (PIX). Crie múltiplos templates com preços, mídias laterais e Order Bumps diferentes.",
      },
      {
        title: "Fluxo do usuário",
        body: [
          "1. Cliente informa WhatsApp válido (chave de acesso aos produtos).",
          "2. Sistema gera QR Code + código PIX copia-e-cola.",
          "3. Polling em payment_transactions detecta confirmação (PAYMENT_RECEIVED / CONFIRMED).",
          "4. Redirecionamento automático para /acesso-produto/:productId.",
        ],
      },
      {
        title: "Mídia lateral",
        body: "Vídeos até 10s em loop mudo com blur — carregados do bucket checkout-media.",
      },
    ],
  },
  {
    id: "produtos-liberacoes",
    num: 5,
    title: "Produtos & Liberações",
    icon: Package,
    color: "#06b6d4",
    intro:
      "Catálogo de produtos digitais com sistema de entitlements (user_entitlements) e páginas de acesso estilo Netflix.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Financeiro → Produtos & Liberações.",
      },
      {
        title: "Estrutura",
        body: [
          "products: catálogo mestre com preço e nome.",
          "checkout_purchases: histórico de compras confirmadas.",
          "user_entitlements: chave WhatsApp → produto liberado.",
          "access_pages: módulos Netflix-style com cards de vídeos.",
        ],
      },
      {
        title: "Acesso do comprador",
        body: [
          "Cliente entra em /acesso e informa WhatsApp usado na compra.",
          "OTP é enviado (whatsapp_access_codes) com rate limit anti-spam.",
          "Após validação, acessa /meus-acessos com todos os produtos liberados.",
        ],
      },
    ],
  },
  {
    id: "postagens",
    num: 6,
    title: "Postagens",
    icon: Calendar,
    color: "#8b5cf6",
    intro:
      "Agendamento em massa de vídeos para o feed principal com criação automática de modelos.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Conteúdo → Postagens.",
      },
      {
        title: "Agendamento",
        body: [
          "Cole múltiplas URLs Bunny — cada linha vira um vídeo agendado.",
          "Avatar da modelo é OBRIGATÓRIO — sistema cria/atualiza a modelo automaticamente.",
          "process-scheduled-posts (edge function) publica na hora programada.",
          "cleanup_old_scheduled_posts limpa registros >24h via pg_cron.",
        ],
      },
      {
        title: "Fila interativa",
        body: "Mini thumbnails auto-play com botão 'Limpar tudo' para reset rápido.",
      },
    ],
  },
  {
    id: "anuncios",
    num: 7,
    title: "Anúncios",
    icon: Radio,
    color: "#ef4444",
    intro:
      "Sistema global de anúncios persistidos no Supabase, exibidos para todos os usuários.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Negócios → Anúncios.",
      },
      {
        title: "Tipos",
        body: [
          "Banners Marketplace — rotação com sync realtime.",
          "Promo Live/Chamada — verde neon para Vídeo Chamada, vermelho para Live.",
          "AdCarousel no menu lateral do TikTok.",
        ],
      },
    ],
  },
  {
    id: "instagram",
    num: 8,
    title: "Perfil Instagram",
    icon: Instagram,
    color: "#e1306c",
    intro:
      "Importação de perfis do Instagram para replicar dentro do app como feed dedicado.",
    sections: [
      {
        title: "Fluxo",
        body: [
          "Rota /perfil-instagram para configuração.",
          "Edge function instagram-import processa via RapidAPI (assíncrono).",
          "Perfis viram feeds acessíveis em /perfil-instagram/:slug.",
        ],
      },
    ],
  },
  {
    id: "afiliados",
    num: 9,
    title: "Afiliados & Indicações",
    icon: Users,
    color: BRAND.green,
    intro:
      "Programa de indicação com carteira Nudix — bônus por cada referral completado.",
    sections: [
      {
        title: "Acesso",
        body: "Painel Admin → Financeiro → Programa de Indicação (Cocons) / Afiliados.",
      },
      {
        title: "Regras",
        body: [
          "Cada usuário recebe código de referral único.",
          "Indicação completada = N$ 1,00 creditado em user_wallets.",
          "Compartilhamento via WhatsApp e Telegram integrado.",
          "Histórico paginado em wallet_transactions.",
        ],
      },
    ],
  },
];

export default function GuiaDoSistema() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Guia Completo do Sistema COCONUDI";
  }, []);

  const printPage = () => window.print();

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: `linear-gradient(180deg, ${BRAND.purpleDark} 0%, ${BRAND.bg} 100%)`,
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-lg print:hidden"
        style={{
          background: `linear-gradient(90deg, ${BRAND.purpleDark}ee, ${BRAND.bg}ee)`,
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-2 font-bold">
            <BookOpen className="w-5 h-5" style={{ color: BRAND.green }} />
            <span>Guia COCONUDI</span>
          </div>
          <button
            onClick={printPage}
            className="flex items-center gap-2 text-white text-xs font-bold px-3 py-2 rounded-lg"
            style={{
              background: `linear-gradient(90deg, ${BRAND.green}, ${BRAND.amber})`,
            }}
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </header>

      {/* Cover */}
      <section className="max-w-5xl mx-auto px-4 pt-14 pb-10 text-center">
        <div
          className="inline-block px-4 py-1 rounded-full text-xs font-bold mb-4"
          style={{
            background: `${BRAND.green}22`,
            color: BRAND.green,
            border: `1px solid ${BRAND.green}55`,
          }}
        >
          MANUAL OFICIAL — v3.0
        </div>
        <h1
          className="text-4xl md:text-6xl font-black tracking-tight mb-4"
          style={{
            backgroundImage: `linear-gradient(90deg, #fff, ${BRAND.green}, ${BRAND.amber})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Guia Completo do Sistema COCONUDI
        </h1>
        <p className="text-white/70 max-w-2xl mx-auto">
          Manual completo com os 9 pilares operacionais da plataforma: como
          cadastrar, configurar e operar cada módulo do painel administrativo.
        </p>
      </section>

      {/* TOC */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div
          className="rounded-2xl p-6 border border-white/10"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <h2 className="text-lg font-bold mb-4 text-white/90">Sumário</h2>
          <ol className="grid md:grid-cols-2 gap-2">
            {CHAPTERS.map((c) => {
              const Icon = c.icon;
              return (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${c.color}22`, color: c.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-white/80">
                      <span className="font-bold" style={{ color: c.color }}>
                        {String(c.num).padStart(2, "0")}.
                      </span>{" "}
                      {c.title}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Chapters */}
      <main className="max-w-5xl mx-auto px-4 pb-24 space-y-16">
        {CHAPTERS.map((c) => {
          const Icon = c.icon;
          return (
            <article
              key={c.id}
              id={c.id}
              className="scroll-mt-24 rounded-2xl overflow-hidden border border-white/10"
              style={{
                background: `linear-gradient(180deg, ${c.color}11 0%, rgba(0,0,0,0.4) 100%)`,
              }}
            >
              {/* Chapter header */}
              <header
                className="p-6 md:p-8 border-b border-white/10 flex items-center gap-4"
                style={{
                  background: `linear-gradient(90deg, ${c.color}33 0%, transparent 100%)`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: c.color, boxShadow: `0 0 30px ${c.color}66` }}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: c.color }}
                  >
                    Capítulo {String(c.num).padStart(2, "0")}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    {c.title}
                  </h2>
                </div>
              </header>

              <div className="p-6 md:p-8 space-y-6">
                <p className="text-white/80 text-base leading-relaxed">
                  {c.intro}
                </p>

                {c.sections.map((s, i) => (
                  <div key={i}>
                    <h3
                      className="text-lg font-bold mb-2 flex items-center gap-2"
                      style={{ color: c.color }}
                    >
                      <span
                        className="w-1.5 h-5 rounded-full"
                        style={{ background: c.color }}
                      />
                      {s.title}
                    </h3>
                    {Array.isArray(s.body) ? (
                      <ul className="space-y-2 pl-4">
                        {s.body.map((line, j) => (
                          <li
                            key={j}
                            className="text-white/75 text-sm leading-relaxed relative pl-5"
                          >
                            <span
                              className="absolute left-0 top-2 w-2 h-2 rounded-full"
                              style={{ background: c.color }}
                            />
                            {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-white/75 text-sm leading-relaxed">
                        {s.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </main>

      <footer className="text-center pb-10 text-white/40 text-xs print:hidden">
        © COCONUDI — Guia Interno. Atualizado em{" "}
        {new Date().toLocaleDateString("pt-BR")}.
      </footer>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          article { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
