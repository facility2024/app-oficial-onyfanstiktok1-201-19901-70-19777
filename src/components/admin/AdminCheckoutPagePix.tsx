import { CreditCard } from "lucide-react";
import { AdminCheckoutTemplates } from "./AdminCheckoutTemplates";

export const AdminCheckoutPagePix = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          Página de Checkout (PIX)
        </h2>
        <p className="text-sm text-gray-400 mt-1">Crie páginas PIX independentes, cada uma com seu próprio link, valor, mídia e Order Bumps.</p>
      </div>
      <AdminCheckoutTemplates />
    </div>
  );
};

export default AdminCheckoutPagePix;
