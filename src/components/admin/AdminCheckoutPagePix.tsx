import { CreditCard, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminCheckoutTemplates } from "./AdminCheckoutTemplates";

export const AdminCheckoutPagePix = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-400" />
            Página de Checkout (PIX)
          </h2>
          <p className="text-sm text-gray-400 mt-1">Crie páginas PIX independentes, cada uma com seu próprio link, valor, mídia e Order Bumps.</p>
        </div>
        <Link
          to="/admin/como-usar-pix"
          target="_blank"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
        >
          <BookOpen className="w-4 h-4" /> Como usar
        </Link>
      </div>
      <AdminCheckoutTemplates />
    </div>
  );
};

export default AdminCheckoutPagePix;
