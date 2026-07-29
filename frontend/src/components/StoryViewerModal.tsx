import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Eye, Star } from 'lucide-react';
import { Status, User } from '../types/index.js';

interface StoryViewerModalProps {
  activeStatusViewer: Status[] | null;
  activeStatusIndex: number;
  setActiveStatusViewer: (val: Status[] | null) => void;
  activeStatusIndexSetter: (idx: number) => void;
  currentUser: User | null;
  storyReplyText: string;
  setStoryReplyText: (val: string) => void;
  onReply: () => void;
  onLike: (statusId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  activeStatusViewer,
  activeStatusIndex,
  setActiveStatusViewer,
  activeStatusIndexSetter,
  currentUser,
  storyReplyText,
  setStoryReplyText,
  onReply,
  onLike,
}) => {
  return (
    <AnimatePresence>
      {activeStatusViewer && (
        <div 
          className="fixed inset-0 bg-black flex items-center justify-center z-50 p-3 sm:p-6 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveStatusViewer(null);
            }
          }}
        >
          {/* ProgressBar */}
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 flex gap-1 z-50">
            {activeStatusViewer.map((_, i) => (
              <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`bg-indigo-500 h-full ${i === activeStatusIndex ? 'w-full transition-all duration-[3000ms]' : (i < activeStatusIndex ? 'w-full' : 'w-0')}`}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveStatusViewer(null)}
            className="absolute top-7 sm:top-10 right-3 sm:right-6 text-white/60 hover:text-white font-bold z-50"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Slide item content */}
          {(() => {
            const currentStatus = activeStatusViewer[activeStatusIndex];
            let metadata: any = null;
            try {
              if (currentStatus.caption && currentStatus.caption.trim().startsWith('{')) {
                metadata = JSON.parse(currentStatus.caption);
              }
            } catch (e) {}

            return (
              <div className="w-full max-w-[420px] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)] aspect-[4/5] bg-slate-900 rounded-2xl sm:rounded-[32px] overflow-hidden flex flex-col justify-between items-center p-4 sm:p-6 border border-white/10 relative">
                {currentStatus.type === 'text' ? (
                  <div
                    style={{ backgroundColor: currentStatus.backgroundColor || '#4f46e5' }}
                    className="absolute inset-0 flex items-center justify-center p-6"
                  >
                    <p className="text-xl font-extrabold text-white text-center">{currentStatus.content}</p>
                  </div>
                ) : (
                  currentStatus.type === 'video' ? (
                    <video src={currentStatus.content} autoPlay loop muted className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <img src={currentStatus.content} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )
                )}

                {/* Top Bar: Creator Info & Analytics */}
                <div className="w-full flex justify-between items-center z-20 bg-slate-950/40 backdrop-blur-sm p-2.5 sm:p-3 rounded-2xl border border-white/5 absolute top-8 sm:top-10 left-3 sm:left-4 right-3 sm:right-4 max-w-[calc(100%-24px)] sm:max-w-[calc(100%-32px)]">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-800 overflow-hidden border border-white/20">
                      {currentStatus.userId.avatar && <img src={currentStatus.userId.avatar} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-bold text-white leading-none">{currentStatus.userId.username}</h4>
                      <p className="text-[8px] text-white/60 mt-0.5">{new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-white/80" title="Views count">
                      <Eye className="h-3.5 w-3.5" />
                      {currentStatus.views?.length || 0}
                    </span>
                    <button 
                      onClick={() => onLike(currentStatus._id)}
                      className={`flex items-center gap-1 text-[9px] font-bold transition-colors ${
                        currentStatus.likes?.includes(currentUser?._id as any) ? 'text-red-400' : 'text-white/80 hover:text-red-400'
                      }`}
                      title="React / Like"
                    >
                      <Star className="h-3.5 w-3.5" />
                      {currentStatus.likes?.length || 0}
                    </button>
                  </div>
                </div>

                {/* Float Overlays (Location, Mention, Music, Hashtags) */}
                <div className="absolute top-24 left-3 sm:left-4 right-3 sm:right-4 z-20 flex flex-col gap-2 pointer-events-none">
                  <div className="flex justify-between w-full">
                    {metadata?.location && (
                      <span className="bg-indigo-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-lg">📍 {metadata.location}</span>
                    )}
                    {metadata?.mention && (
                      <span className="bg-pink-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md shadow-lg">@{metadata.mention}</span>
                    )}
                  </div>

                  {metadata?.music && (
                    <div className="self-end bg-black/70 text-amber-400 text-[8px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 backdrop-blur-md shadow-lg animate-pulse">
                      🎵 {metadata.music}
                    </div>
                  )}
                </div>

                {/* Interactive Widget overlay (Poll / Questions / Slider) */}
                <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 z-20 space-y-3">                </div>

                {/* Caption & Hashtags bottom overlay */}
                <div className="absolute bottom-16 left-4 right-4 z-20 space-y-1.5 text-center pointer-events-none">
                  {metadata?.hashtags && (
                    <div className="flex gap-1.5 justify-center flex-wrap">
                      {metadata.hashtags.map((h: string, i: number) => (
                        <span key={i} className="text-[9px] bg-slate-950/80 text-white px-2 py-0.5 rounded-full font-bold">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  {(!metadata && currentStatus.caption) ? (
                    <div className="bg-slate-950/70 backdrop-blur-sm p-2 rounded-xl text-[10px] font-semibold text-white">
                      {currentStatus.caption}
                    </div>
                  ) : null}
                </div>

                {/* Active Slide Reply Drawer */}
                <div className="absolute bottom-4 left-4 right-4 z-20 flex gap-2">
                  <input
                    type="text"
                    placeholder="Reply to story..."
                    value={storyReplyText}
                    onChange={(e) => setStoryReplyText(e.target.value)}
                    className="flex-1 h-9 rounded-xl text-xs font-semibold px-3 bg-white/15 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <button 
                    onClick={onReply}
                    className="h-9 px-3 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 shrink-0 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </AnimatePresence>
  );
};
