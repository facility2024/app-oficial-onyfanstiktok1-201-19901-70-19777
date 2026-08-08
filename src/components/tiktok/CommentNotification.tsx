import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface CommentNotificationProps {
  isVisible: boolean;
  username: string;
  preview: string;
  onClose: () => void;
}

export const CommentNotification = ({ isVisible, username, preview, onClose }: CommentNotificationProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-md rounded-2xl p-4 shadow-2xl z-50 cursor-pointer"
          onClick={onClose}
        >
          <div className="flex items-start gap-3">
            <motion.div 
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white/20 rounded-full p-2"
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                💬 {username} comentou
              </p>
              <p className="text-white/80 text-xs truncate mt-1">
                "{preview}"
              </p>
            </div>
          </div>
          
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 3, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-full"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
