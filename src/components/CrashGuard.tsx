import React from 'react';

interface CrashGuardProps {
  children: React.ReactNode;
}

interface CrashGuardState {
  hasError: boolean;
  errorInfo?: { message?: string };
}

// Error Boundary para evitar tela branca no mobile sem alterar a lógica do app
export class CrashGuard extends React.Component<CrashGuardProps, CrashGuardState> {
  constructor(props: CrashGuardProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: { message: String(error?.message || 'Erro inesperado') } };
  }

  componentDidCatch(error: any, errorInfo: any) {
    try {
      console.error('CrashGuard capturou um erro:', error, errorInfo);
    } catch {}
  }

  handleRetry = () => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
        if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-xl font-semibold">Carregamento interrompido</h1>
            <p className="text-sm opacity-80">O aplicativo encontrou um erro inesperado. Suas curtidas, comentários e visualizações não foram alterados.</p>
            <button onClick={this.handleRetry} className="px-4 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 transition">
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}
