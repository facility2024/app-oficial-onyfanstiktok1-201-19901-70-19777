import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import PixCheckoutModal from "@/components/PixCheckoutModal";
import { useCheckoutPixSettings } from "@/hooks/useCheckoutPixSettings";

const CheckoutGlobalPage = () => {
  const navigate = useNavigate();
  const { settings, loading } = useCheckoutPixSettings();
  const [open, setOpen] = useState(true);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  const amount = Number(settings.default_amount) || 0;

  return (
    <div className="fixed inset-0 bg-black">
      <PixCheckoutModal
        open={open}
        onClose={() => {
          setOpen(false);
          navigate("/app");
        }}
        amount={amount}
        productName="Acesso Coconudi"
        productDescription="Pagamento seguro via PIX"
        productImage={settings.product_image_url || undefined}
      />
    </div>
  );
};

export default CheckoutGlobalPage;
