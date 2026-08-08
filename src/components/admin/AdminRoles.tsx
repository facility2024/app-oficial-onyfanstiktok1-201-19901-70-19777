import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, UserPlus, Search, Trash2, Filter, Users } from 'lucide-react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { AddRoleModal } from './AddRoleModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

interface AdminRolesProps {
  currentUserId?: string;
}

export const AdminRoles = ({ currentUserId }: AdminRolesProps) => {
  const { roles, loading, fetchRoles, removeRole, getRoleStats } = useUserRoles();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<{ userId: string; role: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const stats = getRoleStats();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return '🔴';
      case 'moderator':
        return '🔵';
      case 'user':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const handleDeleteClick = (userId: string, role: string) => {
    setRoleToDelete({ userId, role });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (roleToDelete && currentUserId) {
      await removeRole(roleToDelete.userId, roleToDelete.role, currentUserId);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  // Filtrar roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch = 
      role.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.user?.raw_user_meta_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterRole === 'all' || role.role === filterRole;

    return matchesSearch && matchesFilter;
  });

  // Agrupar roles por usuário
  const userRolesMap = new Map<string, typeof roles>();
  filteredRoles.forEach(role => {
    const existing = userRolesMap.get(role.user_id) || [];
    userRolesMap.set(role.user_id, [...existing, role]);
  });

  const userRolesList = Array.from(userRolesMap.values());

  // Paginação
  const totalPages = Math.ceil(userRolesList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = userRolesList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderators</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.moderators}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gerenciamento de Roles
            </CardTitle>
            <Button onClick={() => setAddModalOpen(true)} className="w-full sm:w-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Email</th>
                      <th className="text-left p-4">Nome</th>
                      <th className="text-left p-4">Roles</th>
                      <th className="text-right p-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((userRoles) => {
                      const firstRole = userRoles[0];
                      return (
                        <tr key={firstRole.user_id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="font-medium">{firstRole.user?.email || 'N/A'}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground">
                              {firstRole.user?.raw_user_meta_data?.full_name || '-'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {userRoles.map((role) => (
                                <Badge 
                                  key={role.id} 
                                  variant={getRoleBadgeVariant(role.role)}
                                  className="flex items-center gap-1"
                                >
                                  <span>{getRoleIcon(role.role)}</span>
                                  {role.role}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              {userRoles.map((role) => (
                                <Button
                                  key={role.id}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteClick(role.user_id, role.role)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Adicionar Role */}
      <AddRoleModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={fetchRoles}
        currentUserId={currentUserId || ''}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a role <strong>{roleToDelete?.role}</strong> deste usuário?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
