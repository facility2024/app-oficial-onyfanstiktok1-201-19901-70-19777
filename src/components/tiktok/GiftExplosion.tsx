import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GiftExplosionProps {
  onComplete?: () => void;
}

export const GiftExplosion = ({ onComplete }: GiftExplosionProps) => {
  const [isOpened, setIsOpened] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const handleGiftClick = () => {
    if (!isOpened) {
      setIsOpened(true);
      setShowParticles(true);
      
      // Cleanup after animation
      setTimeout(() => {
        onComplete?.();
      }, 4000);
    }
  };

  // Generate random confetti particles
  const confettiParticles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#fd79a8'][i % 6],
    delay: Math.random() * 0.5,
    angle: (i * 12) + Math.random() * 20,
    distance: 150 + Math.random() * 100,
    rotation: Math.random() * 360,
  }));

  // Generate small gifts
  const smallGifts = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    color: ['#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#f39c12', '#e67e22', '#1abc9c', '#34495e'][i],
    delay: 0.2 + Math.random() * 0.3,
    angle: i * 45 + Math.random() * 30,
    distance: 120 + Math.random() * 80,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-80 h-80">
        {/* Background magical effect */}
        <AnimatePresence>
          {isOpened && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-400/30 via-pink-400/20 to-transparent blur-xl"
            />
          )}
        </AnimatePresence>

        {/* Main Gift Container */}
        <motion.div
          className="relative w-full h-full cursor-pointer"
          onClick={handleGiftClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Gift Base - Using uploaded image */}
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden shadow-2xl"
            animate={isOpened ? { 
              scale: [1, 1.2, 0.8],
              rotateY: [0, 180, 360],
              z: [0, 50, 0]
            } : {}}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* Gift Image */}
            <img 
              src="/lovable-uploads/6c530b25-3997-4d0c-8bf8-237cfa2fca63.png"
              alt="Gift"
              className="w-full h-full object-cover rounded-full"
              style={{
                filter: 'drop-shadow(0 20px 40px rgba(231,76,60,0.4))'
              }}
            />
            
            {/* Gift shine effect overlay */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-white/10 to-transparent opacity-60"
              style={{ clipPath: 'polygon(0 0, 60% 0, 30% 60%, 0 30%)' }}
              animate={isOpened ? { opacity: [0.6, 0] } : {}}
              transition={{ duration: 0.5 }}
            />
          </motion.div>

          {/* Gift Lid - Opens upward */}
          <AnimatePresence>
            {isOpened && (
              <motion.div
                initial={{ 
                  rotateX: 0,
                  y: 0,
                  z: 0
                }}
                animate={{ 
                  rotateX: -120,
                  y: -100,
                  z: 50,
                  scale: 0.8
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1.2,
                  ease: "easeOut",
                  delay: 0.2
                }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(145deg, #e74c3c, #c0392b)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  transformOrigin: 'bottom center',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Lid interior */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-pink-200 to-pink-300" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Small Gifts Explosion */}
        <AnimatePresence>
          {showParticles && smallGifts.map((gift) => (
            <motion.div
              key={`gift-${gift.id}`}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: 0,
                opacity: 0
              }}
              animate={{
                x: Math.cos((gift.angle * Math.PI) / 180) * gift.distance,
                y: Math.sin((gift.angle * Math.PI) / 180) * gift.distance,
                scale: [0, 1.2, 0.8, 0],
                rotate: [0, 180, 360, 720],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 2.5,
                delay: gift.delay,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2 w-8 h-8 transform -translate-x-1/2 -translate-y-1/2"
            >
              <div 
                className="w-full h-full rounded shadow-lg"
                style={{
                  background: `linear-gradient(145deg, ${gift.color}, ${gift.color}dd)`,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              />
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-yellow-400 transform -translate-y-1/2" />
              <div className="absolute top-0 left-1/2 w-0.5 h-full bg-yellow-400 transform -translate-x-1/2" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Confetti Particles */}
        <AnimatePresence>
          {showParticles && confettiParticles.map((particle) => (
            <motion.div
              key={`confetti-${particle.id}`}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                rotate: particle.rotation,
                opacity: 0
              }}
              animate={{
                x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
                y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance + 50,
                scale: [0, 1, 0.5, 0],
                rotate: particle.rotation + 720,
                opacity: [0, 1, 0.8, 0]
              }}
              transition={{
                duration: 3,
                delay: particle.delay,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2 w-3 h-3 transform -translate-x-1/2 -translate-y-1/2 rounded-sm"
              style={{
                backgroundColor: particle.color,
                boxShadow: `0 2px 4px rgba(0,0,0,0.2), 0 0 10px ${particle.color}50`
              }}
            />
          ))}
        </AnimatePresence>

        {/* Sparkle Effects */}
        <AnimatePresence>
          {showParticles && Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: 1.5,
                delay: Math.random() * 1,
                repeat: 2,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
                filter: 'drop-shadow(0 0 6px white)',
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
              }}
            />
          ))}
        </AnimatePresence>

        {/* Central Light Burst */}
        <AnimatePresence>
          {isOpened && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 3, 5]
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 w-32 h-32 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-white via-yellow-200 to-transparent blur-sm"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};