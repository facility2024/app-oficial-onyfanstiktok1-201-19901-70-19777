import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InstagramProfilePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold">Perfil do Instagram</h1>
          </div>
        </div>
      </header>

      {/* Conteúdo placeholder */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 mb-4">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Em breve</h2>
          <p className="text-white/70">
            Esta é a área do <strong>Perfil do Instagram</strong>. O conteúdo desta seção será
            construído em seguida.
          </p>
        </div>
      </main>
    </div>
  );
};

export default InstagramProfilePage;
