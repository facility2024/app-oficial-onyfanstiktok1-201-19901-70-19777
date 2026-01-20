import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    // Limpar caches antes de recarregar
    try {
      sessionStorage.removeItem('initial_feed_v3');
      sessionStorage.removeItem('logging_out');
    } catch (e) {
      // Ignorar erros de storage
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Ops! Algo deu errado
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Ocorreu um erro ao carregar o conteúdo. Tente novamente.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleRetry}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente funcional para fallback simples de lazy loading
export const LazyFallback = () => (
  <div className="w-full h-32 bg-gray-900/30 rounded-xl animate-pulse flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  </div>
);

export default ErrorBoundary;
