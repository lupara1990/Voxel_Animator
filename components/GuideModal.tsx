
import React from 'react';

interface GuideModalProps {
  onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  const steps = [
    {
      title: "1. Import Your Voxel Art",
      desc: "Upload a .vox file (MagicaVoxel format). VoxAura will attempt to automatically segment your model into standard rig parts.",
      icon: "fa-file-import"
    },
    {
      title: "2. Rigging & Hierarchy",
      desc: "Open the Rigging Panel. Select parts to adjust their 'Rest Pose' (pivot points) and assign parent bones to create skeletons.",
      icon: "fa-cubes"
    },
    {
      title: "3. Animate on the Timeline",
      desc: "Move the playhead on the bottom timeline. Use the 'Auto Keyframe' feature and the Gizmos (Move/Rotate) to pose your character.",
      icon: "fa-running"
    },
    {
      title: "4. Cinematic Staging",
      desc: "Switch to the Scene Panel. Adjust HDRI environments, soft shadows, and bloom to achieve a high-end minimalist aesthetic.",
      icon: "fa-palette"
    },
    {
      title: "5. Render with Gemini Veo",
      desc: "Hit 'Render' in the toolbar. Describe your desired cinematic look, and let Gemini generate a high-quality video of your motion.",
      icon: "fa-film"
    }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-neutral-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] scale-in-center animate-in zoom-in-95 duration-500">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white">VoxAura Workflow Guide</h2>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Master Voxel Motion</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-6 group">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-xl group-hover:shadow-indigo-500/20">
                  <i className={`fas ${step.icon} text-lg`}></i>
                </div>
                {idx < steps.length - 1 && <div className="w-px h-full bg-white/5 mt-4"></div>}
              </div>
              <div className="pt-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/90 mb-2">{step.title}</h3>
                <p className="text-[11px] text-white/40 leading-relaxed font-sans max-w-md">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-10 border-t border-white/5 bg-black/20 text-center">
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            Start Creating
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideModal;
