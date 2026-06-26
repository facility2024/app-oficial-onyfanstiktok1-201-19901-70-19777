import React from 'react';
import { AdminRoute } from '@/components/AdminRoute';
import { AdminVideoScheduler } from '@/components/admin/AdminVideoScheduler';
import { CarouselScheduler } from '@/components/admin/CarouselScheduler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PostagemPage = () => {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-background p-4">
        <Tabs defaultValue="video" className="max-w-6xl mx-auto">
          <TabsList className="mb-4">
            <TabsTrigger value="video">Vídeos</TabsTrigger>
            <TabsTrigger value="carrossel">Carrossel + Áudio</TabsTrigger>
          </TabsList>
          <TabsContent value="video"><AdminVideoScheduler /></TabsContent>
          <TabsContent value="carrossel"><CarouselScheduler /></TabsContent>
        </Tabs>
      </div>
    </AdminRoute>
  );
};

export default PostagemPage;
