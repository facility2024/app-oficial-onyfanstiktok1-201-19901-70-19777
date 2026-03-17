import React from 'react';
import { AdminRoute } from '@/components/AdminRoute';
import { AdminVideoScheduler } from '@/components/admin/AdminVideoScheduler';

const PostagemPage = () => {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-background p-4">
        <AdminVideoScheduler />
      </div>
    </AdminRoute>
  );
};

export default PostagemPage;
