import { useState, useEffect } from 'react';
import { Comment } from '@/types/database';
import ProfileMessageBox from '@/components/tiktok/ProfileMessageBox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useVideoInteractionsRealtime } from '@/hooks/useVideoInteractionsRealtime';
import { Wifi, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentsScreenProps {
  comments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (text: string) => void;
  videoId?: string;
  onReloadComments?: () => void;
}

export const CommentsScreen = ({ comments, isOpen, onClose, onAddComment, videoId, onReloadComments }: CommentsScreenProps) => {
  const { user, profile } = useCurrentUser();
  const { isPremium } = usePremiumStatus();
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Real-time sync for new comments
  const { newComments, clearNewComments, isConnected } = useVideoInteractionsRealtime(
    videoId || null,
    null,
    (newComment) => {
      console.log('📩 Novo comentário real-time:', newComment);
      if (onReloadComments) {
        onReloadComments();
      }
    }
  );

  // Clear new comments buffer when they're loaded
  useEffect(() => {
    if (newComments.length > 0 && onReloadComments) {
      clearNewComments();
    }
  }, [newComments, clearNewComments, onReloadComments]);

  if (!isOpen) return null;

  const handleSend = (message: string) => {
    onAddComment(message);
  };

  const toggleCommentLike = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 h-[80vh] md:h-[60vh] bg-black z-[10000] rounded-t-3xl transform transition-transform duration-300 flex flex-col">
      {/* Header */}
      <div className="flex flex-col">
        {/* Drag Bar */}
        <div className="w-12 h-1 bg-white/40 rounded-full mx-auto mt-3 mb-4"></div>
        
        <div className="flex justify-between items-center px-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-white font-semibold">Comentários</h3>
              <span className="text-white/60 text-sm">{comments.length} comentários</span>
            </div>
            {isConnected && (
              <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10">
                <Wifi className="h-3 w-3 mr-1" /> Ao vivo
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/70 text-2xl w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/60">
            <div className="text-4xl mb-3">💬</div>
            <p>Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {comments.map((comment, index) => (
                <motion.div 
                  key={comment.id}
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 25,
                    delay: index * 0.05 
                  }}
                  className="flex gap-3"
                >
                  <img
                    src={comment.user?.avatar_url || DEFAULT_AVATAR}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">
                        {comment.user?.username || 'Usuário'}
                      </span>
                      <span className="text-white/50 text-xs">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-white text-sm leading-relaxed mb-2">
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleCommentLike(comment.id)}
                        className={`flex items-center gap-1 text-xs ${
                          likedComments.has(comment.id) ? 'text-red-500' : 'text-white/50'
                        } hover:text-red-400 transition-colors`}
                      >
                        <span>{likedComments.has(comment.id) ? '❤️' : '♡'}</span>
                        <span>{comment.likes_count}</span>
                      </button>
                      <button className="text-white/50 hover:text-white text-xs transition-colors">
                        Responder
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Comment Input */}
      <div className="border-t border-white/10 p-4 flex gap-3 items-end">
        {/* User Avatar */}
        <div className="flex-shrink-0 relative">
          <img
            src={profile?.avatar_url || DEFAULT_AVATAR}
            alt={profile?.username || user?.email || 'Meu perfil'}
            className={`w-8 h-8 rounded-full object-cover ${isPremium ? 'ring-2 ring-amber-400' : ''}`}
          />
          {isPremium && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <Crown className="w-2.5 h-2.5 text-black" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <ProfileMessageBox
            modelName={profile?.username || user?.email?.split('@')[0] || 'criador'}
            inputId="comment-input"
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
};