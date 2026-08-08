import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Shield, ShieldCheck, Image as ImageIcon, MousePointerClick, Lock, Copyright, Smartphone, FileText } from "lucide-react";

const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3">
    <h2 className="text-lg font-bold text-white flex items-center gap-2">
      <Icon className="w-5 h-5 text-emerald-400" />
      {title}
    </h2>
    <div className="text-sm text-gray-300 space-y-2 leading-relaxed">{children}</div>
  </section>
);

const Field = ({
  name,
  desc,
  example,
}: {
  name: string;
  desc: string;
  example: React.ReactNode;
}) => (
  <div className="border-l-2 border-emerald-500/40 pl-3 py-1">
    <p className="text-white font-semibold">Campo: {name}</p>
    <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
    <p className="text-emerald-300 text-xs mt-1">
      <span className="text-gray-500">Exemplo: </span>
      {example}
    </p>
  </div>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">
    {children}
  </code>
);

export default function AdminHowToUsePix() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Admin
        </Link>

        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-black text-white">
            📝 Como usar a Criação da Página PIX
          </h1>
          <p className="text-gray-400 text-sm">
            Guia completo dos campos de texto, URLs e personalização visual disponíveis no editor de
            checkout PIX. Todos os campos são <b>opcionais</b> — deixe vazio para usar o padrão do sistema.
          </p>
        </header>

        <Section icon={Clock} title="⏰ Timer de Urgência">
          <Field
            name="Texto do timer"
            desc="Frase exibida ao lado do contador regressivo no topo da página para gerar urgência."
            example={<Code>⏰ Oferta expira em:</Code>}
          />
        </Section>

        <Section icon={Shield} title="🔒 Selo de Segurança">
          <Field
            name="Texto abaixo do selo"
            desc="Pequena frase de confiança exibida abaixo do selo de segurança."
            example={<Code>Pagamento 100% seguro e criptografado</Code>}
          />
        </Section>

        <Section icon={ShieldCheck} title="🛡️ Banner de Segurança">
          <Field
            name="URL do banner de segurança"
            desc="Link direto (https://) para uma imagem contendo selos de segurança (SSL, PIX, Banco Central etc.), exibida no rodapé do checkout."
            example={<Code>https://cdn.site.com/selos.png</Code>}
          />
        </Section>

        <Section icon={ImageIcon} title="🖼️ Logo Personalizada">
          <Field
            name="URL da logo customizada"
            desc="Link direto (https://) para uma imagem PNG ou SVG da logo exibida no topo da página. Se não for informado, será utilizada a logo padrão da Coconudi."
            example={<Code>https://cdn.site.com/logo-produto.png</Code>}
          />
        </Section>

        <Section icon={MousePointerClick} title="🟢 Botão de Compra">
          <Field
            name="Texto do botão"
            desc="Texto exibido no botão principal de pagamento."
            example={
              <>
                <Code>QUERO GARANTIR AGORA</Code> ou <Code>PAGAR COM PIX</Code>
              </>
            }
          />
          <Field
            name="Cor do botão (HEX)"
            desc="Cor de fundo do botão utilizando código hexadecimal."
            example={
              <span className="inline-flex items-center gap-2">
                <Code>#22c55e</Code>
                <span className="inline-block w-4 h-4 rounded" style={{ background: "#22c55e" }} />
                <Code>#ef4444</Code>
                <span className="inline-block w-4 h-4 rounded" style={{ background: "#ef4444" }} />
              </span>
            }
          />
        </Section>

        <Section icon={Lock} title="🔐 Mensagem de Segurança">
          <Field
            name="Texto de segurança do rodapé"
            desc="Frase exibida no final da página reforçando a segurança da compra."
            example={<Code>Compra protegida. Seus dados nunca são compartilhados.</Code>}
          />
        </Section>

        <Section icon={Copyright} title="© Assinatura do Rodapé">
          <Field
            name="Feito por (Autor)"
            desc="Nome da empresa ou marca exibido no rodapé do checkout."
            example={<Code>© 2026 Coconudi</Code>}
          />
        </Section>

        <Section icon={Smartphone} title="📱 Campo de WhatsApp">
          <Field
            name="Rótulo do WhatsApp"
            desc="Título exibido acima do campo onde o cliente informa seu número."
            example={<Code>📱 Seu WhatsApp (chave de acesso)</Code>}
          />
          <Field
            name="Placeholder do WhatsApp"
            desc="Texto de exemplo exibido dentro do campo antes do preenchimento."
            example={<Code>(11) 99999-9999</Code>}
          />
        </Section>

        <Section icon={FileText} title="📄 Termos e Informações Legais">
          <Field
            name="Texto legal (Termos)"
            desc="Bloco de texto exibido no final da página contendo termos de uso, LGPD, política de reembolso e demais informações legais."
            example={
              <Code>
                Ao finalizar a compra, você concorda com nossos Termos de Uso, Política de Privacidade
                e condições de reembolso.
              </Code>
            }
          />
        </Section>

        <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-4 text-sm text-emerald-100">
          💡 <b>Dica:</b> deixe qualquer campo <b>vazio</b> para usar o valor padrão global. Preencha
          somente o que quer personalizar nesta página específica.
        </div>
      </div>
    </div>
  );
}
