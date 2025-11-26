import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';

interface RealtimeIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export const RealtimeIndicator = ({ isConnected, className }: RealtimeIndicatorProps) => {
  if (!isConnected) return null;
  
  return (
    <motion.div 
      className={`flex items-center gap-1 ${className}`}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative"
      >
        <Wifi className="h-3 w-3 text-green-400" />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-green-400 rounded-full blur-sm -z-10"
        />
      </motion.div>
      <span className="text-green-400 text-xs font-medium">Ao vivo</span>
    </motion.div>
  );
};
