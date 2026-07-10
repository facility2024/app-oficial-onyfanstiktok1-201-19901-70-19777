import { useEffect, useState } from 'react';

const STORAGE_KEY = 'coconudi_age_confirmed';

export const AgeGate = ({ children }: { children: React.ReactNode }) => {
  const [confirmed, setConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    setConfirmed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const handleYes = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setConfirmed(true);
  };

  const handleNo = () => {
    try {
      window.open('', '_self');
      window.close();
    } catch (_) {
      // ignore
    }
    // Fallback: redirect out do app
    window.location.replace('https://www.google.com');
  };

  if (confirmed === null) return null;
  if (confirmed) return <>{children}</>;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url('https://COCONUDIMUDIAL.b-cdn.net/ANUNCIANTES%20COCONUDI/%26.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-8 text-center shadow-[0_0_60px_rgba(180,80,255,0.35)]">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{
            background:
              'linear-gradient(135deg, #ff0000, #ff8c00, #ffd700, #00c853, #2979ff, #7c4dff)',
          }}
        >
          18+
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Sou maior de 18 anos
        </h2>
        <p className="text-sm text-white/70 mb-6">
          Este aplicativo contém conteúdo destinado exclusivamente a maiores de
          18 anos. Confirme sua idade para continuar.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleYes}
            className="w-full rounded-full py-3 font-semibold text-white transition-transform active:scale-95"
            style={{
              background:
                'linear-gradient(90deg, #7c4dff, #ff0080)',
              boxShadow: '0 0 20px rgba(180,80,255,0.5)',
            }}
          >
            Sim, sou maior de 18
          </button>
          <button
            onClick={handleNo}
            className="w-full rounded-full py-3 font-semibold text-white/80 border border-white/20 hover:bg-white/5 transition"
          >
            Não
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgeGate;
