import React from 'react';
import { AnimatePresence } from 'framer-motion';

interface StoryCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyType: 'text' | 'media';
  setStoryType: (type: 'text' | 'media') => void;
  textStatusContent: string;
  setTextStatusContent: (val: string) => void;
  textStatusBg: string;
  setTextStatusBg: (val: string) => void;
  storyMusic: string;
  setStoryMusic: (val: string) => void;
  storyLocation: string;
  setStoryLocation: (val: string) => void;
  storyMention: string;
  setStoryMention: (val: string) => void;
  storyHashtags: string;
  setStoryHashtags: (val: string) => void;
  storyPollQuestion: string;
  setStoryPollQuestion: (val: string) => void;
  storyPollOpt1: string;
  setStoryPollOpt1: (val: string) => void;
  storyPollOpt2: string;
  setStoryPollOpt2: (val: string) => void;
  storyQuestion: string;
  setStoryQuestion: (val: string) => void;
  storyEmojiSliderTarget: string;
  setStoryEmojiSliderTarget: (val: string) => void;
  storyFile: File | null;
  setStoryFile: (file: File | null) => void;
  storyFileUrl: string | null;
  setStoryFileUrl: (url: string | null) => void;
  storyFileInputRef: React.RefObject<HTMLInputElement | null>;
  onPost: () => void;
}

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  isOpen,
  onClose,
  storyType,
  setStoryType,
  textStatusContent,
  setTextStatusContent,
  textStatusBg,
  setTextStatusBg,
  storyMusic,
  setStoryMusic,
  storyLocation,
  setStoryLocation,
  storyMention,
  setStoryMention,
  storyHashtags,
  setStoryHashtags,
  storyPollQuestion,
  setStoryPollQuestion,
  storyPollOpt1,
  setStoryPollOpt1,
  storyPollOpt2,
  setStoryPollOpt2,
  storyQuestion,
  setStoryQuestion,
  storyEmojiSliderTarget,
  storyFile,
  setStoryFile,
  storyFileUrl,
  setStoryFileUrl,
  storyFileInputRef,
  onPost,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <div className="w-full max-w-[800px] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-48px)] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            
            {/* Left Column: Live Preview */}
            <div 
              style={storyType === 'text' ? { backgroundColor: textStatusBg } : undefined}
              className="w-full md:w-[320px] max-h-[46dvh] md:max-h-none aspect-[4/5] bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 relative border-b md:border-b-0 md:border-r border-slate-800 shrink-0 overflow-hidden"
            >
              {storyType === 'media' && storyFileUrl ? (
                storyFile?.type.startsWith('video') ? (
                  <video src={storyFileUrl} autoPlay loop muted className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <img src={storyFileUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )
              ) : null}

              {/* Overlays preview on top of the slide */}
              <div className="w-full flex justify-between items-center z-10">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-white/50">Story Preview</span>
                {storyMusic.trim() && (
                  <span className="bg-black/60 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    🎵 {storyMusic}
                  </span>
                )}
              </div>

              {storyType === 'text' ? (
                <textarea
                  value={textStatusContent}
                  onChange={(e) => setTextStatusContent(e.target.value)}
                  placeholder="Type your story message..."
                  className="w-full bg-transparent border-0 outline-none text-white text-lg font-black text-center placeholder:text-white/30 focus:ring-0 z-10"
                />
              ) : (
                <div className="flex-1" />
              )}

              {/* Dynamic Overlays Container */}
              <div className="w-full flex flex-col gap-2 z-10">
                <div className="flex justify-between w-full">
                  {storyLocation.trim() && (
                    <span className="bg-indigo-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">📍 {storyLocation}</span>
                  )}
                  {storyMention.trim() && (
                    <span className="bg-pink-600/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">@{storyMention}</span>
                  )}
                </div>

                {storyPollQuestion.trim() && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 rounded-xl text-center text-white text-[10px]">
                    <p className="font-bold">{storyPollQuestion}</p>
                    <div className="flex gap-1.5 mt-1.5">
                      <button className="flex-1 py-1 bg-indigo-500/80 rounded font-bold">{storyPollOpt1 || 'Yes'}</button>
                      <button className="flex-1 py-1 bg-pink-500/80 rounded font-bold">{storyPollOpt2 || 'No'}</button>
                    </div>
                  </div>
                )}

                {storyQuestion.trim() && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-2.5 rounded-xl text-center text-white text-[10px] space-y-1">
                    <p className="font-bold uppercase tracking-wider text-indigo-300 text-[8px]">Ask me anything</p>
                    <p className="font-semibold">{storyQuestion}</p>
                  </div>
                )}

                {storyHashtags.trim() && (
                  <div className="flex gap-1 flex-wrap">
                    {storyHashtags.split(',').map((h, i) => (
                      <span key={i} className="text-[9px] bg-slate-900/60 text-white px-2 py-0.5 rounded-full font-bold">
                        {h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Editing and Interactive Controls */}
            <div className="flex-1 min-h-0 flex flex-col justify-between p-4 sm:p-6 space-y-4 overflow-hidden">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest">Story Options</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setStoryType('text')} 
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${storyType === 'text' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Text
                    </button>
                    <button 
                      onClick={() => setStoryType('media')} 
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${storyType === 'media' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      Media
                    </button>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[42dvh] md:max-h-[320px] pr-1.5 custom-scrollbar">
                  {/* Media File selection */}
                  {storyType === 'media' && (
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                      <input 
                        type="file" 
                        ref={storyFileInputRef} 
                        className="hidden" 
                        accept="image/*,video/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setStoryFile(file);
                            setStoryFileUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <button 
                        onClick={() => storyFileInputRef.current?.click()} 
                        className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-bold text-xs rounded-xl"
                      >
                        Choose Image / Video
                      </button>
                      {storyFile && <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{storyFile.name}</span>}
                    </div>
                  )}

                  {/* Background picker for text stories */}
                  {storyType === 'text' && (
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Background Colors</label>
                      <div className="flex gap-2">
                        {['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#1e1b4b'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setTextStatusBg(color)}
                            style={{ backgroundColor: color }}
                            className={`h-6 w-6 rounded-full border border-white/20 transition-transform ${textStatusBg === color ? 'scale-110 ring-2 ring-white/50' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Overlay Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">🎵 Background Music</label>
                      <input 
                        type="text" 
                        value={storyMusic}
                        onChange={(e) => setStoryMusic(e.target.value)}
                        placeholder="Song title..."
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">📍 Add Location</label>
                      <input 
                        type="text" 
                        value={storyLocation}
                        onChange={(e) => setStoryLocation(e.target.value)}
                        placeholder="e.g. SF, CA..."
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">👤 Mention User</label>
                      <input 
                        type="text" 
                        value={storyMention}
                        onChange={(e) => setStoryMention(e.target.value)}
                        placeholder="username..."
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">🏷️ Hashtags</label>
                      <input 
                        type="text" 
                        value={storyHashtags}
                        onChange={(e) => setStoryHashtags(e.target.value)}
                        placeholder="vibes, coding..."
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Interactive widgets additions */}
                  <div className="pt-2 border-t border-slate-850 space-y-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">📊 Create Poll Overlay</label>
                      <input 
                        type="text" 
                        value={storyPollQuestion}
                        onChange={(e) => setStoryPollQuestion(e.target.value)}
                        placeholder="Poll Question..."
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200 mb-1"
                      />
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={storyPollOpt1}
                          onChange={(e) => setStoryPollOpt1(e.target.value)}
                          placeholder="Option 1 (Yes)"
                          className="flex-1 h-8 rounded-lg text-[10px] px-2 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                        <input 
                          type="text" 
                          value={storyPollOpt2}
                          onChange={(e) => setStoryPollOpt2(e.target.value)}
                          placeholder="Option 2 (No)"
                          className="flex-1 h-8 rounded-lg text-[10px] px-2 bg-slate-950 border border-slate-850 text-slate-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1">❓ Ask a Question Overlay</label>
                      <input 
                        type="text" 
                        value={storyQuestion}
                        onChange={(e) => setStoryQuestion(e.target.value)}
                        placeholder="e.g. What should I cook today?"
                        className="w-full h-8 rounded-lg text-xs font-semibold px-2.5 bg-slate-950 border border-slate-850 text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-850 shrink-0">
                <button 
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={onPost}
                  className="h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/10"
                >
                  Post Story
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
