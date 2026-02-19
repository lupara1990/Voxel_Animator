
import React, { useState } from 'react';

interface ExportModalProps {
  config: { resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' };
  onUpdateConfig: (config: { resolution: '720p' | '1080p'; aspectRatio: '16:9' | '9:16' }) => void;
  onClose: () => void;
  onConfirm: (prompt: string) => void;
  defaultPrompt: string;
}

const ExportModal: React.FC<ExportModalProps> = ({ config, onUpdateConfig, onClose, onConfirm, defaultPrompt }) => {
  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl scale-in-center animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-400">Cinematic Export Settings</h3>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors"><i className="fas fa-times"></i></button>
        </div>

        <div className="p-8 space-y-8">
          {/* Resolution Selection */}
          <section>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-4">Output Resolution</label>
            <div className="grid grid-cols-2 gap-3">
              {(['720p', '1080p'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => onUpdateConfig({ ...config, resolution: res })}
                  className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${config.resolution === res ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  <span className="text-lg font-bold">{res}</span>
                  <span className="text-[9px] uppercase tracking-widest font-medium opacity-60">
                    {res === '720p' ? 'Standard Definition' : 'High Definition'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Aspect Ratio Selection */}
          <section>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-4">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-3">
              {(['16:9', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => onUpdateConfig({ ...config, aspectRatio: ratio })}
                  className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${config.aspectRatio === ratio ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  <div className={`border-2 border-current opacity-40 ${ratio === '16:9' ? 'w-8 h-4.5' : 'w-4.5 h-8'}`}></div>
                  <span className="text-xs font-bold">{ratio}</span>
                  <span className="text-[9px] uppercase tracking-widest font-medium opacity-60">
                    {ratio === '16:9' ? 'Landscape' : 'Portrait'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Cinematic Prompt Override */}
          <section>
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-3">Cinematic Description Override</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white/80 outline-none focus:border-indigo-500/50 transition-colors resize-none leading-relaxed"
              placeholder="Describe the cinematic style..."
            />
            <p className="text-[9px] text-white/20 mt-2 italic font-sans leading-relaxed">
              Gemini Veo will use this to influence lighting, textures, and fluid motion.
            </p>
          </section>
        </div>

        <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(customPrompt)}
            className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            Start Cinematic Render
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
