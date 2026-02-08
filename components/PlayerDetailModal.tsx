
import React from 'react';
import { CharacterStatus } from '../types';
import { Button } from './Button';

interface Props {
  username: string;
  avatar: string;
  customAvatar?: string;
  race: string;
  status: CharacterStatus;
  // History prop is removed/ignored to ensure story is hidden
  onClose: () => void;
}

export const PlayerDetailModal: React.FC<Props> = ({ username, avatar, customAvatar, race, status, onClose }) => {
  const hpPercent = Math.max(0, Math.min(100, (status.hp / status.maxHp) * 100));
  const mpPercent = Math.max(0, Math.min(100, (status.mp / status.maxMp) * 100));
  const isGod = !!status.isGodMode;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-scale-in">
      <div className="raphael-panel w-full max-w-lg rounded-lg border border-cyan-500/50 shadow-[0_0_60px_rgba(6,182,212,0.3)] relative overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-10" 
             style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(6, 182, 212, .3) 25%, rgba(6, 182, 212, .3) 26%, transparent 27%, transparent 74%, rgba(6, 182, 212, .3) 75%, rgba(6, 182, 212, .3) 76%, transparent 77%, transparent)', backgroundSize: '30px 30px' }}>
        </div>

        {/* HEADER */}
        <div className="bg-cyan-950/90 p-4 border-b border-cyan-500/50 flex justify-between items-center relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">👁</span>
            <div>
                 <h2 className="text-xl font-bold text-cyan-100 system-font tracking-widest text-glow leading-none">
                    THẨM ĐỊNH MỤC TIÊU
                 </h2>
                 <span className="text-[10px] text-cyan-500 font-mono tracking-[0.2em]">TARGET APPRAISAL</span>
            </div>
          </div>
          <button onClick={onClose} className="text-cyan-500 hover:text-white px-2 font-bold text-xl">✕</button>
        </div>

        {/* BODY - STATS ONLY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 bg-slate-900/60 p-6">
            <div className="space-y-6">
                {/* Identity Card */}
                <div className="flex items-center gap-4 p-4 bg-slate-800/50 border border-cyan-800 rounded relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1">
                        <div className="text-[9px] font-mono text-slate-500 border border-slate-700 px-1 rounded">ID: {username}</div>
                    </div>
                    
                    <div className="w-20 h-20 rounded-full border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] overflow-hidden shrink-0 bg-black flex items-center justify-center">
                        {customAvatar ? (
                            <img src={customAvatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl">{avatar}</span>
                        )}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white flex items-center gap-2">
                            {username}
                            {isGod && <span className="text-purple-400 text-[10px] border border-purple-500 px-1 rounded bg-purple-900/50 animate-pulse">GOD</span>}
                        </div>
                        <div className="text-xs text-cyan-400 font-mono mt-1">
                            <span className="text-slate-500 uppercase tracking-wider">Race:</span> {race}
                        </div>
                        <div className="text-sm font-bold text-yellow-500 text-shadow-yellow mt-1">
                            {status.evolutionStage}
                        </div>
                    </div>
                </div>

                {/* Vitals */}
                <div className="space-y-4 p-4 border border-cyan-900/30 bg-black/20 rounded">
                    <div>
                        <div className="flex justify-between text-[10px] font-bold text-cyan-300 mb-1 uppercase tracking-wider">
                            <span>SINH LỰC (HP)</span>
                            <span className={isGod ? 'text-lg text-yellow-300' : 'font-mono'}>
                                {isGod ? "∞ / ∞" : `${status.hp.toLocaleString()} / ${status.maxHp.toLocaleString()}`}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-900 border border-cyan-900/50 rounded-sm overflow-hidden relative">
                            <div className="absolute inset-0 bg-red-900/20"></div>
                            <div className="h-full bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${isGod ? 100 : hpPercent}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] font-bold text-cyan-300 mb-1 uppercase tracking-wider">
                            <span>NĂNG LƯỢNG (MP)</span>
                            <span className={isGod ? 'text-lg text-yellow-300' : 'font-mono'}>
                                {isGod ? "∞ / ∞" : `${status.mp.toLocaleString()} / ${status.maxMp.toLocaleString()}`}
                            </span>
                        </div>
                        <div className="h-2 bg-slate-900 border border-cyan-900/50 rounded-sm overflow-hidden relative">
                            <div className="absolute inset-0 bg-yellow-900/20"></div>
                            <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)]" style={{ width: `${isGod ? 100 : mpPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Skills */}
                <div>
                    <div className="flex items-center justify-between mb-3 border-b border-cyan-800 pb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-cyan-400">⚡</span>
                            <h3 className="text-xs font-bold text-cyan-200 uppercase tracking-widest">KỸ NĂNG SỞ HỮU</h3>
                        </div>
                        <span className="text-[10px] text-cyan-600">{status.skills.length} SKILLS</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                        {status.skills.length === 0 ? (
                            <div className="text-center text-slate-500 text-xs italic py-4">Không phát hiện kỹ năng nào.</div>
                        ) : (
                            status.skills.map((skill, idx) => {
                                const isUlt = skill.includes('Chi Vương') || skill.includes('Thần') || skill.includes('Raphael');
                                return (
                                    <div key={idx} className={`px-3 py-2 text-xs rounded border transition-all flex items-center justify-between
                                        ${isUlt ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-100' : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-200'}
                                    `}>
                                        <span className={isUlt ? 'font-bold' : ''}>{skill}</span>
                                        {status.equippedSkills.includes(skill) && (
                                            <span className="text-[9px] bg-cyan-600 text-white px-1.5 py-0.5 rounded font-bold tracking-wider">ACTIVE</span>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-cyan-950/80 border-t border-cyan-800/50 flex justify-center shrink-0">
            <Button onClick={onClose} variant="ghost" className="border-cyan-700 text-cyan-400 w-full hover:bg-cyan-900/50 text-xs tracking-[0.2em]">
                [ NGẮT KẾT NỐI ]
            </Button>
        </div>

      </div>
    </div>
  );
};
