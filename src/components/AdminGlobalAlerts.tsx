import { useEffect } from 'react';
import { useAdminRole } from '@/hooks/useUserRoles';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Monitor global de alertas administrativos.
 * Toca beep e mostra toast quando novos eventos de segurança chegam,
 * mesmo com o painel admin fechado (mantém rodando em qualquer rota).
 */
export const AdminGlobalAlerts = () => {
  const { isAdmin, loading } = useAdminRole();
  const enabled = !loading && isAdmin;
  const { notifications } = useAdminNotifications({ soundOnSecurity: enabled });
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    const latest = notifications.find(n => n.type === 'security' && !n.read);
    if (!latest) return;
    const shownKey = `admin_global_toast_${latest.id}`;
    if (sessionStorage.getItem(shownKey)) return;
    sessionStorage.setItem(shownKey, '1');
    toast.error(latest.title, {
      description: latest.description,
      duration: 8000,
      action: {
        label: 'Ver no painel',
        onClick: () => navigate('/admin'),
      },
    });
  }, [notifications, enabled, navigate]);

  return null;
};
