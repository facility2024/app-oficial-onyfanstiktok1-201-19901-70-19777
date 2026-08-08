import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FloatingHeart {
  id: string;
  x: number;
  delay: number;
  scale: number;
  color: string;
}

interface FloatingHeartsProps {
  trigger: number;
}

export const FloatingHearts = ({ trigger }: FloatingHeartsProps) => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);

  useEffect(() => {
    if (trigger > 0) {
      const newHearts = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        x: -20 + Math.random() * 40,
        delay: i * 0.1,
        scale: 0.8 + Math.random() * 0.4,
        color: ['#ff6b6b', '#ff8787', '#ffa8a8', '#fff'][Math.floor(Math.random() * 4)]
      }));
      
      setHearts(prev => [...prev, ...newHearts]);
      
      setTimeout(() => {
        setHearts(prev => prev.filter(h => !newHearts.find(n => n.id === h.id)));
      }, 2000);
    }
  }, [trigger]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {hearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 0, scale: 0, y: 0, x: heart.x }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              scale: [0, heart.scale, heart.scale, 0],
              y: -150,
              x: heart.x + Math.sin(heart.x) * 20
            }}
            transition={{ duration: 1.5, delay: heart.delay, ease: "easeOut" }}
            className="absolute bottom-20 left-1/2"
          >
            <Heart 
              className="drop-shadow-lg" 
              fill={heart.color} 
              color={heart.color}
              size={24 * heart.scale}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
