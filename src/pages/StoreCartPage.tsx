import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

const StoreCartPage = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const { user } = useCurrentUser();
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: user?.email || '', phone: '', address: '', city: '', state: '', zipcode: '' });

  // Fix mobile scroll
  React.useEffect(() => {
    document.documentElement.classList.add('allow-scroll');
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    return () => {
      document.documentElement.classList.remove('allow-scroll');
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  const platformFee = totalPrice * 0.30;
  const sellerAmount = totalPrice * 0.70;

  const handleFinalize = async () => {
    if (!user) {
      toast.error('Faça login para continuar');
      navigate('/auth');
      return;
    }
    if (!form.name || !form.phone || !form.address) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Create orders for each item
      for (const item of items) {
        await (supabase as any).from('marketplace_orders').insert({
          user_id: user.id,
          product_id: item.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          status: 'pending',
          shipping_address: JSON.stringify(form),
        });
      }

      toast.success('Pedido realizado com sucesso! 🎉');
      clearCart();
      navigate('/marketplace/lojas');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao finalizar pedido');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !showCheckout) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-white/10 bg-gray-950/90 backdrop-blur-md">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Carrinho</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <ShoppingBag className="w-16 h-16 text-gray-600" />
          <p className="text-gray-400 text-lg">Seu carrinho está vazio</p>
          <Button onClick={() => navigate('/marketplace/lojas')} className="bg-gradient-to-r from-[#7CB342] to-[#558B2F] text-white font-bold">
            Explorar Lojas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3 border-b border-white/10 backdrop-blur-md"
        style={{ background: 'linear-gradient(to right, rgba(88, 28, 135, 0.95) 0%, rgba(59, 7, 100, 0.95) 35%, rgba(24, 24, 27, 0.98) 70%, rgba(10, 10, 10, 1) 100%)' }}
      >
        <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ShoppingBag className="w-5 h-5" />
        <h1 className="text-lg font-bold">Carrinho ({totalItems})</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Items */}
        {!showCheckout && (
          <>
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 bg-gray-900 rounded-xl p-3 border border-white/10">
                <img
                  src={item.image_url || '/placeholder.svg'}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  {item.store_name && <p className="text-xs text-gray-400">{item.store_name}</p>}
                  <p className="text-[#7CB342] font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-gray-900 rounded-xl p-4 border border-white/10 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal ({totalItems} itens)</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Taxa da plataforma (30%)</span>
                <span>R$ {platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Valor do lojista (70%)</span>
                <span>R$ {sellerAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-[#7CB342]">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={() => setShowCheckout(true)}
              className="w-full h-12 text-white font-bold text-base"
              style={{ background: 'linear-gradient(to right, #7CB342, #C4842E)' }}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Finalizar Compra
            </Button>
          </>
        )}

        {/* Checkout form */}
        {showCheckout && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Dados de Entrega</h2>

            <div className="space-y-3">
              <div>
                <Label className="text-gray-300 text-xs">Nome completo *</Label>
                <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-gray-900 border-white/10 text-white" placeholder="Seu nome" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Email</Label>
                <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} className="bg-gray-900 border-white/10 text-white" placeholder="email@exemplo.com" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Telefone *</Label>
                <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} className="bg-gray-900 border-white/10 text-white" placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Endereço completo *</Label>
                <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} className="bg-gray-900 border-white/10 text-white" placeholder="Rua, número, complemento" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="bg-gray-900 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Estado</Label>
                  <Input value={form.state} onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))} className="bg-gray-900 border-white/10 text-white" />
                </div>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">CEP</Label>
                <Input value={form.zipcode} onChange={(e) => setForm(p => ({ ...p, zipcode: e.target.value }))} className="bg-gray-900 border-white/10 text-white" placeholder="00000-000" />
              </div>
            </div>

            {/* Total */}
            <div className="bg-gray-900 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between text-lg font-bold">
                <span>Total a pagar</span>
                <span className="text-[#7CB342]">R$ {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCheckout(false)} className="flex-1 border-white/20 text-white hover:bg-white/10">
                Voltar
              </Button>
              <Button
                onClick={handleFinalize}
                disabled={loading}
                className="flex-1 text-white font-bold"
                style={{ background: 'linear-gradient(to right, #7CB342, #C4842E)' }}
              >
                {loading ? 'Processando...' : 'Confirmar Pedido'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreCartPage;
