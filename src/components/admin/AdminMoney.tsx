import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, CreditCard, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';

export const AdminMoney = () => {
  const { 
    transactions, 
    stats, 
    paymentMethods, 
    loading, 
    formatCurrency, 
    formatNumber 
  } = useFinancialData();

  const financialStats = [
    { 
      label: 'Receita Total', 
      value: formatCurrency(stats.totalRevenue), 
      icon: DollarSign, 
      color: 'text-success', 
      trend: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%` 
    },
    { 
      label: 'Vendas Hoje', 
      value: formatCurrency(stats.todaySales), 
      icon: TrendingUp, 
      color: 'text-primary', 
      trend: `${stats.salesGrowth >= 0 ? '+' : ''}${stats.salesGrowth.toFixed(1)}%` 
    },
    { 
      label: 'Transações', 
      value: formatNumber(stats.totalTransactions), 
      icon: CreditCard, 
      color: 'text-warning', 
      trend: `+${stats.transactionsGrowth.toFixed(1)}%` 
    },
    { 
      label: 'Saldo', 
      value: formatCurrency(stats.balance), 
      icon: PiggyBank, 
      color: 'text-accent', 
      trend: `+${stats.balanceGrowth.toFixed(1)}%` 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Carregando dados financeiros...</div>
      </div>
    );
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription': return 'Assinatura';
      case 'tip': return 'Gorjeta';
      case 'content': return 'Conteúdo';
      case 'private_message': return 'Mensagem Privada';
      case 'gift': return 'Presente';
      default: return 'Outro';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'subscription': return 'bg-primary text-primary-foreground';
      case 'tip': return 'bg-success text-success-foreground';
      case 'content': return 'bg-warning text-warning-foreground';
      case 'private_message': return 'bg-accent text-accent-foreground';
      case 'gift': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return 'Desconhecido';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Pix': return 'bg-success';
      case 'Cartão de Crédito': return 'bg-primary';
      case 'Cartão de Débito': return 'bg-accent';
      case 'Boleto': return 'bg-warning';
      case 'Transferência': return 'bg-muted-foreground';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {financialStats.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.trend.startsWith('+');
          
          return (
            <Card key={index} className="bg-gradient-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center mt-1">
                      {isPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-success mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-destructive mr-1" />
                      )}
                      <span className={`text-xs font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>💳 Transações Recentes top10</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-card-hover transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-medium">
                      {transaction.customer_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{transaction.customer_name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getTransactionTypeColor(transaction.transaction_type)}`}>
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{formatCurrency(transaction.amount)}</p>
                    <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <span>💰 Métodos de Pagamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethods.map((method, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{method.method}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">{method.percentage.toFixed(1)}%</span>
                      <p className="text-xs text-muted-foreground">{formatCurrency(method.amount)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getPaymentMethodColor(method.method)}`}
                      style={{ width: `${method.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue - Real Data Summary */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>📈 Resumo de Vendas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border border-border rounded-lg hover:bg-card-hover transition-colors">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total de Transações</p>
              <p className="text-lg font-bold text-foreground mb-2">{stats.totalTransactions}</p>
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">Registradas</span>
              </div>
            </div>
            
            <div className="text-center p-4 border border-border rounded-lg hover:bg-card-hover transition-colors">
              <p className="text-sm font-medium text-muted-foreground mb-1">Receita Bruta</p>
              <p className="text-lg font-bold text-foreground mb-2">{formatCurrency(stats.totalRevenue)}</p>
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium text-success">Antes das taxas</span>
              </div>
            </div>

            <div className="text-center p-4 border border-border rounded-lg hover:bg-card-hover transition-colors">
              <p className="text-sm font-medium text-muted-foreground mb-1">Receita Líquida</p>
              <p className="text-lg font-bold text-foreground mb-2">{formatCurrency(stats.balance)}</p>
              <div className="flex items-center justify-center">
                <span className="text-xs font-medium text-primary">Após as taxas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary - Real Data */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-primary" />
            <span>💼 Resumo Financeiro Real</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-success">{formatCurrency(stats.balance)}</div>
              <p className="text-sm text-success/80">Lucro Líquido</p>
              <p className="text-xs text-muted-foreground mt-1">Após taxas</p>
            </div>
            
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-warning">{formatCurrency(stats.totalFees || 0)}</div>
              <p className="text-sm text-warning/80">Taxas & Comissões</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalRevenue > 0 ? ((stats.totalFees || 0) / stats.totalRevenue * 100).toFixed(1) : 0}% da receita</p>
            </div>
            
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-sm text-primary/80">Receita Bruta</p>
              <p className="text-xs text-muted-foreground mt-1">Antes das deduções</p>
            </div>
            
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg text-center">
              <div className="text-2xl font-bold text-accent">{stats.profitMargin.toFixed(1)}%</div>
              <p className="text-sm text-accent/80">Margem de Lucro</p>
              <p className="text-xs text-muted-foreground mt-1">Lucro/Receita</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};