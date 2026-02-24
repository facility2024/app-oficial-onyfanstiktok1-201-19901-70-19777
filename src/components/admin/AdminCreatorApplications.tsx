import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, Eye, ExternalLink, Copy, Send, KeyRound, Trash2, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface CreatorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  nickname: string;
  bio: string;
  gender: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

interface ApprovalCredentials {
  email: string;
  temp_password: string | null;
  account_created: boolean;
  full_name: string;
  whatsapp: string;
}

interface AdminCreatorApplicationsProps {
  currentUserId?: string;
}

export const AdminCreatorApplications = ({ currentUserId }: AdminCreatorApplicationsProps) => {
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [directCreators, setDirectCreators] = useState<{id: string; email: string; name: string; username: string; is_active: boolean}[]>([]);
  const [externalCadastros, setExternalCadastros] = useState<{id: string; nome: string; email: string; whatsapp: string; status: string; created_at: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<ApprovalCredentials | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://tiktokonyfans.b-cdn.net/material%20coconudi/som%20para%20admin.mp3');
      audio.volume = 0.6;
      audio.play().then(() => {
        console.log('🔔 Som de notificação reproduzido com sucesso');
      }).catch((err) => {
        console.warn('Não foi possível tocar som de notificação:', err);
      });
    } catch (e) {
      console.warn('Não foi possível tocar som de notificação:', e);
    }
  };

  const fetchExternalCadastros = async () => {
    try {
      // Buscar cadastros aprovados na tabela cadastro_modelos
      const { data: cadastros, error } = await (supabase as any)
        .from('cadastro_modelos')
        .select('id, nome, email, whatsapp, status, created_at')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar cadastro_modelos:', error);
        return;
      }

      if (!cadastros?.length) {
        setExternalCadastros([]);
        return;
      }

      // Filtrar: remover os que já têm role de creator
      const { data: creatorRoles } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');

      const creatorEmails = new Set<string>();
      if (creatorRoles?.length) {
        const creatorIds = creatorRoles.map((r: any) => r.user_id);
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, email')
          .in('id', creatorIds);
        (profiles || []).forEach((p: any) => {
          if (p.email) creatorEmails.add(p.email.toLowerCase());
        });
      }

      // Também filtrar os que já estão em creator_applications
      const { data: apps } = await (supabase as any)
        .from('creator_applications')
        .select('email');
      (apps || []).forEach((a: any) => {
        if (a.email) creatorEmails.add(a.email.toLowerCase());
      });

      const pendingCadastros = cadastros.filter((c: any) => !creatorEmails.has(c.email.toLowerCase()));
      setExternalCadastros(pendingCadastros);
    } catch (error) {
      console.error('Erro ao buscar cadastros externos:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchDirectCreators();
    fetchExternalCadastros();
    const channel = supabase
      .channel('creator_applications_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creator_applications' }, (payload) => {
        console.log('🔔 REALTIME: Nova aplicação de criador detectada!', payload);
        playNotificationSound();
        toast.info('🔔 Nova aplicação de criador recebida!', { duration: 10000 });
        fetchApplications();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'creator_applications' }, () => fetchApplications())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'creator_applications' }, () => fetchApplications())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cadastro_modelos' }, (payload) => {
        console.log('🔔 REALTIME: Novo cadastro externo detectado!', payload);
        playNotificationSound();
        toast.info('🔔 Novo cadastro externo recebido!', { duration: 10000 });
        fetchExternalCadastros();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cadastro_modelos' }, () => fetchExternalCadastros())
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime conectado - escutando creator_applications e cadastro_modelos');
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDirectCreators = async () => {
    try {
      // Fetch creators from user_roles who don't have a creator_application
      const { data: creatorRoles } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'creator');
      
      if (!creatorRoles?.length) return;
      
      const creatorIds = creatorRoles.map((r: any) => r.user_id);
      
      const { data: apps } = await (supabase as any)
        .from('creator_applications')
        .select('user_id');
      
      const appUserIds = new Set((apps || []).map((a: any) => a.user_id));
      const directIds = creatorIds.filter((id: string) => !appUserIds.has(id));
      
      if (!directIds.length) {
        setDirectCreators([]);
        return;
      }
      
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('id, email, name, username')
        .in('id', directIds);
      
      setDirectCreators((profiles || []).map((p: any) => ({ ...p, is_active: true })));
    } catch (error) {
      console.error('Erro ao buscar criadores diretos:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('creator_applications')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Erro ao buscar aplicações:', error);
      toast.error('Erro ao carregar aplicações');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: CreatorApplication) => {
    if (!currentUserId) {
      toast.error('Usuário não identificado');
      return;
    }

    try {
      setProcessing(true);

      const { data, error } = await supabase.functions.invoke('approve-creator', {
        body: { application_id: application.id }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      setCredentials({
        email: data.email,
        temp_password: data.temp_password,
        account_created: data.account_created,
        full_name: data.full_name,
        whatsapp: data.whatsapp,
      });
      setSelectedApp(null);
      setShowCredentialsModal(true);
      
      if (data.email_sent) {
        toast.success('✅ Aprovado! Email com credenciais enviado com sucesso!');
      } else {
        toast.warning(`⚠️ Aprovado, mas o email NÃO foi enviado. ${data.email_error || 'Envie as credenciais manualmente via WhatsApp ou copie abaixo.'}`, { duration: 15000 });
      }
    } catch (error: any) {
      console.error('Erro ao aprovar aplicação:', error);
      toast.error('Erro ao aprovar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !currentUserId) return;
    if (!rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da rejeição');
      return;
    }
    try {
      setProcessing(true);
      const { error } = await (supabase as any)
        .from('creator_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
          rejection_reason: rejectionReason
        })
        .eq('id', selectedApp.id);
      if (error) throw error;
      toast.success('Aplicação rejeitada');
      setShowRejectModal(false);
      setSelectedApp(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Erro ao rejeitar aplicação:', error);
      toast.error('Erro ao rejeitar aplicação');
    } finally {
      setProcessing(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = credentials.temp_password
      ? `🎉 Parabéns! Você foi aprovada como criadora no COCONUDI!\n\n📧 Email: ${credentials.email}\n🔑 Senha: ${credentials.temp_password}\n\n🔗 Acesse: https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/auth\n\n⚠️ Troque sua senha após o primeiro login!`
      : `🎉 Parabéns! Você foi aprovada como criadora no COCONUDI!\n\n📧 Acesse com seu email: ${credentials.email}\n🔗 Link: https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/auth`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  const sendViaWhatsApp = () => {
    if (!credentials) return;
    const number = credentials.whatsapp.replace(/\D/g, '');
    const text = credentials.temp_password
      ? encodeURIComponent(`🎉 Parabéns ${credentials.full_name}! Você foi aprovada como criadora no COCONUDI!\n\n📧 Email: ${credentials.email}\n🔑 Senha: ${credentials.temp_password}\n\n🔗 Acesse: https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/auth\n\n⚠️ Troque sua senha após o primeiro login!`)
      : encodeURIComponent(`🎉 Parabéns ${credentials.full_name}! Você foi aprovada como criadora no COCONUDI!\n\n📧 Acesse com seu email: ${credentials.email}\n🔗 Link: https://app-oficial-onyfanstiktok1-201-19901-70-19777.lovable.app/auth`);
    window.open(`https://wa.me/55${number}?text=${text}`, '_blank');
  };

  const handleResetPassword = async (email: string, name: string, whatsapp: string) => {
    if (!currentUserId) {
      toast.error('Usuário não identificado');
      return;
    }
    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('approve-creator', {
        body: { email, full_name: name, whatsapp }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      setCredentials({
        email: data.email,
        temp_password: data.temp_password,
        account_created: data.account_created,
        full_name: data.full_name,
        whatsapp: data.whatsapp,
      });
      setShowCredentialsModal(true);
      
      if (data.email_sent) {
        toast.success('✅ Credenciais geradas e email enviado!');
      } else {
        toast.warning(`⚠️ Credenciais geradas, mas email NÃO enviado. ${data.email_error || 'Envie via WhatsApp.'}`, { duration: 15000 });
      }
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast.error('Erro: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCreator = async (creatorId: string, email: string) => {
    try {
      setProcessing(true);
      const { data, error } = await supabase.functions.invoke('delete-creator', {
        body: { creator_id: creatorId }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      toast.success(`Criador ${email} excluído completamente — acesso revogado e sessão invalidada`);
      fetchDirectCreators();
      fetchApplications();
      fetchExternalCadastros();
    } catch (error: any) {
      console.error('Erro ao excluir criador:', error);
      toast.error('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleCreator = async (creatorId: string, email: string, activate: boolean) => {
    try {
      setProcessing(true);
      if (activate) {
        // Add creator role back
        const { error } = await (supabase as any)
          .from('user_roles')
          .insert({ user_id: creatorId, role: 'creator' });
        if (error && !error.message?.includes('duplicate')) throw error;
        toast.success(`✅ Criador ${email} ativado com sucesso`);
      } else {
        // Remove creator role - user loses access immediately
        const { error } = await (supabase as any)
          .from('user_roles')
          .delete()
          .eq('user_id', creatorId)
          .eq('role', 'creator');
        if (error) throw error;
        toast.success(`⛔ Criador ${email} desativado — acesso ao Creator Studio revogado`);
      }
      // Update local state immediately
      setDirectCreators(prev => prev.map(c => c.id === creatorId ? { ...c, is_active: activate } : c));
      if (!activate) {
        // If deactivated, they'll disappear from directCreators on next fetch since they won't have the role
        fetchDirectCreators();
      }
    } catch (error: any) {
      console.error('Erro ao alternar criador:', error);
      toast.error('Erro: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteExternalCadastro = async (cadastroId: string, email: string) => {
    try {
      setProcessing(true);
      // Check if there's an auth user with this email to also delete their access
      const { data: authUsers } = await supabase.functions.invoke('approve-creator', {
        body: { email, action: 'find_user' }
      });
      
      // Delete from cadastro_modelos
      await (supabase as any).from('cadastro_modelos').delete().eq('id', cadastroId);
      
      toast.success(`Cadastro ${email} excluído com sucesso`);
      fetchExternalCadastros();
    } catch (error: any) {
      console.error('Erro ao excluir cadastro:', error);
      toast.error('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return null;
    }
  };

  const openWhatsApp = (whatsapp: string) => {
    const number = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${number}`, '_blank');
  };

  const filteredApplications = (status: string) => applications.filter(app => app.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            👥 Aplicações de Criadores
            <Badge variant="secondary">{filteredApplications('pending').length} pendentes</Badge>
            <Button size="sm" variant="outline" onClick={() => { playNotificationSound(); toast.info('🔔 Testando som de notificação...'); }} className="ml-auto text-xs">
              🔊 Testar Som
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pendentes ({filteredApplications('pending').length})</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas ({filteredApplications('approved').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitadas ({filteredApplications('rejected').length})</TabsTrigger>
            </TabsList>

            {['pending', 'approved', 'rejected'].map(status => (
              <TabsContent key={status} value={status} className="space-y-4 mt-4">
                {filteredApplications(status).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma aplicação {status === 'pending' ? 'pendente' : status === 'approved' ? 'aprovada' : 'rejeitada'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApplications(status).map(app => (
                      <Card key={app.id} className="bg-card/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-semibold">{app.full_name}</h3>
                                {getStatusBadge(app.status)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>📧 {app.email}</p>
                                <p>🎭 {app.nickname}</p>
                                <p>📱{' '}
                                  <button onClick={() => openWhatsApp(app.whatsapp)} className="text-primary hover:underline inline-flex items-center gap-1">
                                    {app.whatsapp}<ExternalLink className="w-3 h-3" />
                                  </button>
                                </p>
                                <p>📅 {new Date(app.submitted_at).toLocaleDateString('pt-BR')}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                                <Eye className="w-4 h-4 mr-1" />Ver Detalhes
                              </Button>
                              {app.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleApprove(app)} disabled={processing} className="bg-green-500 hover:bg-green-600">
                                    <CheckCircle className="w-4 h-4 mr-1" />Aprovar
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => { setSelectedApp(app); setShowRejectModal(true); }} disabled={processing}>
                                    <XCircle className="w-4 h-4 mr-1" />Rejeitar
                                  </Button>
                                </>
                              )}
                              {app.status === 'approved' && (
                                <Button size="sm" variant="outline" onClick={() => handleApprove(app)} disabled={processing} className="text-primary border-primary">
                                  <Send className="w-4 h-4 mr-1" />Reenviar Credenciais
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Direct Creators (not from applications) */}
      {directCreators.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Criadores Diretos (sem aplicação)
              <Badge variant="secondary">{directCreators.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Criadores adicionados diretamente que podem precisar de credenciais de acesso.
            </p>
            <div className="space-y-3">
              {directCreators.map(creator => (
                <Card key={creator.id} className={`bg-card/50 ${!creator.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={creator.is_active}
                            onCheckedChange={(checked) => handleToggleCreator(creator.id, creator.email, checked)}
                            disabled={processing}
                          />
                          <span className={`text-[10px] font-medium ${creator.is_active ? 'text-green-500' : 'text-red-500'}`}>
                            {creator.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{creator.name || creator.username}</p>
                          <p className="text-sm text-muted-foreground">📧 {creator.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResetPassword(creator.email, creator.name || creator.username, '')}
                          disabled={processing}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <KeyRound className="w-4 h-4 mr-1" />Gerar Credenciais
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={processing}>
                              <Trash2 className="w-4 h-4 mr-1" />Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Criador</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{creator.email}</strong> do banco de dados? Isso removerá a role de criador, vídeos, seguidores e painéis de chat associados. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCreator(creator.id, creator.email)} className="bg-destructive hover:bg-destructive/90">
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Cadastros (from cadastro_modelos table) */}
      {externalCadastros.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Cadastros Externos (Painel Admin)
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">{externalCadastros.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Criadores aprovados no painel externo que ainda precisam de credenciais de acesso geradas aqui.
            </p>
            <div className="space-y-3">
              {externalCadastros.map(cadastro => (
                <Card key={cadastro.id} className="bg-card/50 border-orange-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold">{cadastro.nome}</p>
                        <p className="text-sm text-muted-foreground">📧 {cadastro.email}</p>
                        <p className="text-sm text-muted-foreground">📱 {cadastro.whatsapp}</p>
                        <p className="text-xs text-muted-foreground">📅 {new Date(cadastro.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleResetPassword(cadastro.email, cadastro.nome, cadastro.whatsapp)}
                          disabled={processing}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <KeyRound className="w-4 h-4 mr-1" />Gerar Credenciais
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" disabled={processing}>
                              <Trash2 className="w-4 h-4 mr-1" />Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Cadastro</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{cadastro.email}</strong>? O cadastro será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteExternalCadastro(cadastro.id, cadastro.email)} className="bg-destructive hover:bg-destructive/90">
                                Confirmar Exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedApp && !showRejectModal} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Detalhes da Aplicação</DialogTitle></DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Nome Completo</Label><p className="font-medium">{selectedApp.full_name}</p></div>
                <div><Label className="text-muted-foreground">Apelido</Label><p className="font-medium">{selectedApp.nickname}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedApp.email}</p></div>
                <div><Label className="text-muted-foreground">WhatsApp</Label>
                  <button onClick={() => openWhatsApp(selectedApp.whatsapp)} className="font-medium text-primary hover:underline flex items-center gap-1">
                    {selectedApp.whatsapp}<ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div><Label className="text-muted-foreground">Sexo</Label><p className="font-medium capitalize">{selectedApp.gender.replace('-', ' ')}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><div className="mt-1">{getStatusBadge(selectedApp.status)}</div></div>
              </div>
              <div><Label className="text-muted-foreground">Biografia</Label><p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedApp.bio}</p></div>
              {selectedApp.rejection_reason && (
                <div><Label className="text-red-500">Motivo da Rejeição</Label><p className="mt-1 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">{selectedApp.rejection_reason}</p></div>
              )}
              <div className="flex gap-2 pt-4">
                {selectedApp.status === 'pending' && (
                  <>
                    <Button onClick={() => handleApprove(selectedApp)} disabled={processing} className="flex-1 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />Aprovar Aplicação
                    </Button>
                    <Button variant="destructive" onClick={() => setShowRejectModal(true)} disabled={processing} className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />Rejeitar Aplicação
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Aplicação</DialogTitle>
            <DialogDescription>Por favor, informe o motivo da rejeição. O usuário receberá esta mensagem.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Motivo *</Label>
              <Textarea id="rejection_reason" placeholder="Ex: As informações fornecidas não atendem aos requisitos mínimos..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="min-h-[120px] mt-2" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectionReason(''); }} className="flex-1">Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()} className="flex-1">Confirmar Rejeição</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✅ Criador(a) Aprovado(a)!</DialogTitle>
            <DialogDescription>
              {credentials?.account_created
                ? 'Uma conta foi criada automaticamente. Envie as credenciais abaixo para o(a) modelo.'
                : 'O(a) modelo já possuía conta. A role de criador foi adicionada.'}
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{credentials.full_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Email</Label><p className="font-mono text-sm">{credentials.email}</p></div>
                {credentials.temp_password && (
                  <div><Label className="text-muted-foreground text-xs">Senha temporária</Label><p className="font-mono text-sm font-bold text-primary">{credentials.temp_password}</p></div>
                )}
              </div>
              {credentials.temp_password && (
                <p className="text-xs text-muted-foreground">⚠️ A modelo deve trocar a senha após o primeiro login.</p>
              )}
              <div className="flex gap-2">
                <Button onClick={copyCredentials} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />Copiar
                </Button>
                <Button onClick={sendViaWhatsApp} className="flex-1 bg-green-500 hover:bg-green-600">
                  <Send className="w-4 h-4 mr-2" />WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
