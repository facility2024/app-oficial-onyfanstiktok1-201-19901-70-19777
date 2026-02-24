import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Sparkles, Clock, CalendarDays, Search, Download, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Modelo {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: string;
  notas: string | null;
  created_at: string;
}

interface Empresa {
  id: string;
  nome_negocio: string;
  nome_responsavel: string;
  cnpj: string | null;
  email: string;
  whatsapp: string;
  status: string;
  notas: string | null;
  created_at: string;
}

export const AdminCadastros = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [criadores, setCriadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('modelos');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [modelosRes, empresasRes, criadoresRes] = await Promise.all([
      (supabase as any).from('cadastro_modelos').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('cadastro_empresas').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('creator_applications').select('*').order('created_at', { ascending: false }),
    ]);
    setModelos(modelosRes.data || []);
    setEmpresas(empresasRes.data || []);
    setCriadores(criadoresRes.data || []);
    setLoading(false);
  };

  const updateStatus = async (table: string, id: string, newStatus: string) => {
    const { error } = await (supabase as any).from(table).update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado!');
      fetchAll();
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yy, HH:mm'); } catch { return d; }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pendente: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
      aprovado: 'bg-green-600/20 text-green-400 border-green-600/30',
      rejeitado: 'bg-red-600/20 text-red-400 border-red-600/30',
    };
    return map[s?.toLowerCase()] || 'bg-gray-600/20 text-gray-400 border-gray-600/30';
  };

  const filterItems = <T extends { nome?: string; nome_negocio?: string; email?: string; status?: string; full_name?: string }>(items: T[]) => {
    return items.filter(item => {
      const name = (item as any).nome || (item as any).nome_negocio || (item as any).full_name || '';
      const email = item.email || '';
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'todos' || (item.status || '').toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  };

  const totalModelos = modelos.length;
  const totalEmpresas = empresas.length;
  const pendentes = [...modelos, ...empresas, ...criadores].filter(i => (i.status || '').toLowerCase() === 'pendente').length;
  const hoje = [...modelos, ...empresas, ...criadores].filter(i => {
    try { return new Date(i.created_at).toDateString() === new Date().toDateString(); } catch { return false; }
  }).length;

  const exportCSV = () => {
    let csv = '';
    const items = activeTab === 'modelos' ? filterItems(modelos) : activeTab === 'empresas' ? filterItems(empresas) : filterItems(criadores);
    if (activeTab === 'modelos') {
      csv = 'Nome,Email,WhatsApp,Status,Data\n' + items.map((m: any) => `${m.nome},${m.email},${m.whatsapp},${m.status},${formatDate(m.created_at)}`).join('\n');
    } else if (activeTab === 'empresas') {
      csv = 'Negócio,Responsável,Email,WhatsApp,CNPJ,Status,Data\n' + items.map((e: any) => `${e.nome_negocio},${e.nome_responsavel},${e.email},${e.whatsapp},${e.cnpj || ''},${e.status},${formatDate(e.created_at)}`).join('\n');
    } else {
      csv = 'Nome,Email,WhatsApp,Status,Data\n' + items.map((c: any) => `${c.full_name || c.nickname},${c.email},${c.whatsapp},${c.status},${formatDate(c.created_at)}`).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cadastros-${activeTab}.csv`; a.click();
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-purple-500/20"><Users className="w-6 h-6 text-purple-400" /></div>
            <div><p className="text-2xl font-bold text-white">{totalModelos}</p><p className="text-xs text-gray-400">Total Modelos</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-blue-500/20"><Building2 className="w-6 h-6 text-blue-400" /></div>
            <div><p className="text-2xl font-bold text-white">{totalEmpresas}</p><p className="text-xs text-gray-400">Total Empresas</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-yellow-500/20"><Clock className="w-6 h-6 text-yellow-400" /></div>
            <div><p className="text-2xl font-bold text-white">{pendentes}</p><p className="text-xs text-gray-400">Pendentes</p></div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/20"><CalendarDays className="w-6 h-6 text-green-400" /></div>
            <div><p className="text-2xl font-bold text-white">{hoje}</p><p className="text-xs text-gray-400">Hoje</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="modelos" className="gap-1.5"><Users className="w-4 h-4" /> Modelos</TabsTrigger>
            <TabsTrigger value="empresas" className="gap-1.5"><Building2 className="w-4 h-4" /> Empresas</TabsTrigger>
            <TabsTrigger value="criadores" className="gap-1.5"><Sparkles className="w-4 h-4" /> Criadores</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-gray-800 border-gray-700 w-48" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 bg-gray-800 border-gray-700"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="w-4 h-4" /> Exportar</Button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          {activeTab === 'modelos' && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">WhatsApp</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterItems(modelos).map(m => (
                  <TableRow key={m.id} className="border-gray-800">
                    <TableCell className="font-medium text-white">{m.nome}</TableCell>
                    <TableCell className="text-gray-300">{m.email}</TableCell>
                    <TableCell className="text-gray-300">
                      <a href={`https://wa.me/55${m.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400">{m.whatsapp}</a>
                    </TableCell>
                    <TableCell><Badge className={statusBadge(m.status)}>{m.status}</Badge></TableCell>
                    <TableCell className="text-gray-400">{formatDate(m.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_modelos', m.id, 'aprovado')}>✅ Aprovar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_modelos', m.id, 'rejeitado')}>❌ Rejeitar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_modelos', m.id, 'pendente')}>⏳ Pendente</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filterItems(modelos).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">Nenhum modelo encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'empresas' && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Negócio</TableHead>
                  <TableHead className="text-gray-400">Responsável</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">WhatsApp</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterItems(empresas).map(e => (
                  <TableRow key={e.id} className="border-gray-800">
                    <TableCell className="font-medium text-white">{e.nome_negocio}</TableCell>
                    <TableCell className="text-gray-300">{e.nome_responsavel}</TableCell>
                    <TableCell className="text-gray-300">{e.email}</TableCell>
                    <TableCell className="text-gray-300">
                      <a href={`https://wa.me/55${e.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400">{e.whatsapp}</a>
                    </TableCell>
                    <TableCell><Badge className={statusBadge(e.status)}>{e.status}</Badge></TableCell>
                    <TableCell className="text-gray-400">{formatDate(e.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_empresas', e.id, 'aprovado')}>✅ Aprovar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_empresas', e.id, 'rejeitado')}>❌ Rejeitar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('cadastro_empresas', e.id, 'pendente')}>⏳ Pendente</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filterItems(empresas).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">Nenhuma empresa encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {activeTab === 'criadores' && (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">WhatsApp</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filterItems(criadores).map(c => (
                  <TableRow key={c.id} className="border-gray-800">
                    <TableCell className="font-medium text-white">{c.full_name || c.nickname}</TableCell>
                    <TableCell className="text-gray-300">{c.email}</TableCell>
                    <TableCell className="text-gray-300">
                      <a href={`https://wa.me/55${c.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-400">{c.whatsapp}</a>
                    </TableCell>
                    <TableCell><Badge className={statusBadge(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="text-gray-400">{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => updateStatus('creator_applications', c.id, 'aprovado')}>✅ Aprovar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('creator_applications', c.id, 'rejeitado')}>❌ Rejeitar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus('creator_applications', c.id, 'pendente')}>⏳ Pendente</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filterItems(criadores).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">Nenhum criador encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
