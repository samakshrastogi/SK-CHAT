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
  storySliderEnabled: boolean;
  setStorySliderEnabled: (val: boolean) => void;
  storyAudience: 'contacts';
  setStoryAudience: (val: 'contacts') => void;
  storyFile: File | null;
  setStoryFile: (file: File | null) => void;
  storyFileUrl: string | null;
  setStoryFileUrl: (url: string | null) => void;
  storyFileInputRef: React.RefObject<HTMLInputElement | null>;
  onPost: () => void;
}

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = (props) => {
  const [isPosting, setIsPosting] = React.useState(false);
  const canPost = props.storyType === 'text' ? Boolean(props.textStatusContent.trim()) : Boolean(props.storyFile);

  const postStory = async () => {
    if (!canPost || isPosting) return;
    setIsPosting(true);
    try {
      await props.onPost();
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <AnimatePresence>
      {props.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm"
          onClick={(event) => event.target === event.currentTarget && props.onClose()}
        >
          <div className="flex max-h-[calc(100dvh-24px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-base font-black text-white">Create a story</h3>
                <p className="mt-0.5 text-xs text-slate-400">Visible only to your personal connections for 24 hours</p>
              </div>
              <button type="button" onClick={props.onClose} className="h-9 w-9 rounded-full bg-white/5 text-xl text-slate-300 hover:bg-white/10" aria-label="Close">×</button>
            </header>

            <div className="flex gap-2 p-4 pb-2">
              {(['text', 'media'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => props.setStoryType(type)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold ${props.storyType === type ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  {type === 'text' ? 'Text story' : 'Photo or video'}
                </button>
              ))}
            </div>

            <div className="min-h-0 overflow-y-auto p-4 pt-2">
              <div
                style={props.storyType === 'text' ? { backgroundColor: props.textStatusBg } : undefined}
                className="relative mx-auto flex aspect-[9/13] max-h-[54dvh] w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-950"
              >
                {props.storyType === 'text' ? (
                  <textarea
                    autoFocus
                    maxLength={500}
                    value={props.textStatusContent}
                    onChange={(event) => props.setTextStatusContent(event.target.value)}
                    placeholder="Share an update..."
                    className="h-full w-full resize-none bg-transparent p-6 text-center text-xl font-bold text-white outline-none placeholder:text-white/40"
                  />
                ) : props.storyFileUrl ? (
                  props.storyFile?.type.startsWith('video/')
                    ? <video src={props.storyFileUrl} controls playsInline className="h-full w-full object-contain" />
                    : <img src={props.storyFileUrl} alt="Story preview" className="h-full w-full object-contain" />
                ) : (
                  <button type="button" onClick={() => props.storyFileInputRef.current?.click()} className="m-6 rounded-2xl border border-dashed border-indigo-400/60 px-8 py-10 text-sm font-bold text-indigo-300">
                    Choose a photo or video
                  </button>
                )}
              </div>

              <input
                ref={props.storyFileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  props.setStoryFile(file);
                  props.setStoryFileUrl(file ? URL.createObjectURL(file) : null);
                }}
              />

              {props.storyType === 'text' ? (
                <div className="mt-3 flex justify-center gap-2" aria-label="Background color">
                  {['#4f46e5', '#db2777', '#059669', '#d97706', '#dc2626', '#312e81'].map((color) => (
                    <button key={color} type="button" onClick={() => props.setTextStatusBg(color)} style={{ backgroundColor: color }} className={`h-8 w-8 rounded-full ${props.textStatusBg === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`} />
                  ))}
                </div>
              ) : props.storyFile ? (
                <button type="button" onClick={() => props.storyFileInputRef.current?.click()} className="mt-3 w-full rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200">
                  Replace media · {props.storyFile.name}
                </button>
              ) : null}
            </div>

            <footer className="flex gap-3 border-t border-white/10 p-4">
              <button type="button" onClick={props.onClose} className="h-11 flex-1 rounded-xl bg-slate-800 text-sm font-bold text-slate-200">Cancel</button>
              <button type="button" disabled={!canPost || isPosting} onClick={() => void postStory()} className="h-11 flex-[1.4] rounded-xl bg-indigo-500 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
                {isPosting ? 'Posting…' : 'Share story'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};