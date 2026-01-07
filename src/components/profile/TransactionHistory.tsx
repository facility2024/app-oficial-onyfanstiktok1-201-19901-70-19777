import { useNudixWallet } from '@/hooks/useNudixWallet';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Gift, RefreshCw, ShoppingCart, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export function TransactionHistory() {
  const { 
    wallet, 
    transactions, 
    loading, 
    formatNudix, 
    getTransactionTypeLabel,
    refetch 
  } = useNudixWallet();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'referral_bonus':
        return <Gift className="w-4 h-4 text-green-400" />;
      case 'welcome_bonus':
        return <Gift className="w-4 h-4 text-amber-400" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-red-400" />;
      case 'refund':
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      default:
        return <Wallet className="w-4 h-4 text-gray-400" />;
    }
  };

  const isPositive = (type: string) => {
    return ['referral_bonus', 'welcome_bonus', 'refund'].includes(type);
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-white/10 rounded-lg overflow-hidden">
      {/* Header com Saldo */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-green-900/30 to-emerald-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Carteira Nudix</h3>
              <p className="text-xs text-gray-400">Histórico de transações</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-400">{formatNudix(wallet.nudix_balance)}</p>
            <p className="text-xs text-gray-400">Saldo atual</p>
          </div>
        </div>

        {/* Mini Stats */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">
              Recebido: <span className="text-green-400 font-medium">{formatNudix(wallet.total_earned)}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">
              Gasto: <span className="text-red-400 font-medium">{formatNudix(wallet.total_spent)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="max-h-64 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="p-6 text-center">
            <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma transação ainda</p>
            <p className="text-gray-500 text-xs mt-1">
              Convide amigos para ganhar bônus!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {transactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isPositive(tx.type) ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">
                      {getTransactionTypeLabel(tx.type)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(tx.created_at), "dd MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                        {tx.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${
                  isPositive(tx.type) ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive(tx.type) ? '+' : '-'}{formatNudix(Math.abs(tx.amount))}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}