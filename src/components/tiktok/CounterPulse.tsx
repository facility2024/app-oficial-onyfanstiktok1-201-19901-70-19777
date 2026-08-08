import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CounterPulseProps {
  count: number;
  icon: React.ReactNode;
  label: string;
  isPulsing: boolean;
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

export const CounterPulse = ({ count, icon, label, isPulsing, onClick, isActive, className }: CounterPulseProps) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [showDelta, setShowDelta] = useState(false);

  useEffect(() => {
    if (count !== displayCount) {
      const delta = count - displayCount;
      if (delta > 0) {
        setShowDelta(true);
        setTimeout(() => setShowDelta(false), 800);
      }
      setDisplayCount(count);
    }
  }, [count, displayCount]);

  return (
    <div className={`flex flex-col items-center cursor-pointer group relative ${className}`} onClick={onClick}>
      <motion.div 
        animate={isPulsing ? { 
          scale: [1, 1.3, 1],
          rotate: [0, -5, 5, 0]
        } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${
          isActive ? 'bg-white/20 scale-105' : 'bg-white/10 group-hover:bg-white/20'
        }`}
      >
        {icon}
      </motion.div>
      
      <div className="relative">
        <motion.span 
          key={displayCount}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white text-xs mt-1 font-light"
        >
          {label}
        </motion.span>
        
        <AnimatePresence>
          {showDelta && (
            <motion.span
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -20, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-green-400 text-sm font-bold"
            >
              +1
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
