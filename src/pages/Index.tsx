import { TikTokApp } from './TikTokApp';
import { MobileOptimizer } from '@/components/MobileOptimizer';
import { CrashGuard } from '@/components/CrashGuard';

const Index = () => {
  return (
    <>
      <MobileOptimizer />
      <CrashGuard>
        <TikTokApp />
      </CrashGuard>
    </>
  );
};

export default Index;
