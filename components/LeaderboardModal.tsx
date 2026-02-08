
import React, { useEffect, useState, useRef } from 'react';
import { Character, CharacterStatus, Mail } from '../types';
import { Button } from './Button';
import { authService } from '../services/authService';
import { PlayerDetailModal } from './PlayerDetailModal';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string; 
  username: string; 
  avatar: string; 
  customAvatar?: string; 
  daysSurvived: number;
  ultimateSkillCount: number;
  powerLevel: number; 
  race: string;
  isCurrentUser?: boolean;
  isOnline: boolean;
  detailStatus?: CharacterStatus; 
  isGodMode?: boolean;
  saveData?: any; 
}

interface Props {
  currentUserCharacter: Character;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<Props> = ({ currentUserCharacter, onClose }) => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); 
  const [isLoading, setIsLoading] = useState(true);
  const [serverName, setServerName] = useState("");

  const [selectedUserForMenu, setSelectedUserForMenu] = useState<string | null>(null);
  
  const [viewingPlayer, setViewingPlayer] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const init = async () => {
        const sessionUser = await authService.getCurrentUser();
        if (sessionUser) {
            if (sessionUser.isAdmin) setIsAdmin(true);
            if (sessionUser.username === authService.ADMIN_ID) {
                setIsAdmin(true);
                setIsSuperAdmin(true);
            }
        }
        setServerName(authService.getServerName());
        await refreshLeaderboard();
    };
    init();

    const unsubscribe = authService.subscribeToChanges(() => {
        refreshLeaderboard(true);
    });

    return () => {
        unsubscribe();
    };
  }, [currentUserCharacter]);

  const refreshLeaderboard = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    const allUsers = await authService.getAllUsers();
    const currentSessionUser = await authService.getCurrentUser();

    const entries: LeaderboardEntry[] = allUsers.map((user) => {
        if (user.isBanned) return null;
        if (user.username === authService.ADMIN_ID || user.username === '2') return null;

        const saveData = user.saveData;
        let charName = "Unknown Entity";
        let days = 0;
        let power = 0;
        let skillCount = 0;
        let race = "Spirit";
        let avatar = "👤";
        let customAvatar = undefined;
        let detailStatus: CharacterStatus | undefined = undefined;
        let isGodMode = false;

        if (saveData && saveData.character) {
            const char = saveData.character;
            const history = saveData.chatHistory || [];
            charName = char.name;
            race = char.race;
            skillCount = char.status.skills.length;
            detailStatus = char.status;
            isGodMode = !!char.status.isGodMode;
            customAvatar = char.customAvatar;
            days = Math.max(1, Math.floor(history.length / 10));

            if (isGodMode) {
                power = Infinity;
            } else {
                power = (char.status.hp + char.status.maxMp) * 10 + (skillCount * 1000);
            }

            if (race.includes("Slime")) avatar = "💧";
            else if (race.includes("Human")) avatar = "🧑";
            else if (race.includes("Dragon")) avatar = "🐲";
            else avatar = "👤";
        }

        const isMe = currentSessionUser ? user.username === currentSessionUser.username : false;
        const now = Date.now();
        const lastActive = user.lastActive || 0;
        const isOnline = (now - lastActive) < 2 * 60 * 1000;

        return {
            id: user.username, rank: 0, name: charName, username: user.username,
            avatar, customAvatar, daysSurvived: days, ultimateSkillCount: skillCount,
            powerLevel: power, race, isCurrentUser: isMe, isOnline: isOnline || isMe,
            detailStatus, isGodMode, saveData
        };
    }).filter(e => e !== null) as LeaderboardEntry[];

    entries.sort((a, b) => b.powerLevel - a.powerLevel);
    const rankedEntries = entries.slice(0, 100).map((entry, index) => ({ ...entry, rank: index + 1 }));

    setData(rankedEntries);
    if (!silent) setIsLoading(false);
  };

  const handleUserClick = (entry: LeaderboardEntry) => {
      if (selectedUserForMenu === entry.username) {
          setSelectedUserForMenu(null);
      } else {
          setSelectedUserForMenu(entry.username);
      }
  };

  const handleChallenge = async (entry: LeaderboardEntry) => {
      if (!entry.detailStatus) return;
      const me = await authService.getCurrentUser();
      if (!me) return;
      const myData = await authService.loadGameData(me.username);
      if (!myData || !myData.character) return;
      
      const p1_max = myData.character.status.maxHp;
      const p2_max = entry.detailStatus.maxHp;
      const result = await authService.createBattle(me.username, entry.username, p1_max, p1_max, p2_max, p2_max);
      
      if (result === true) {
          alert(`Đã gửi thách đấu tới [${entry.username}]!`);
          onClose();
      } else {
          alert("Lỗi tạo trận đấu.");
      }
  };
  
  const handleInspect = (entry: LeaderboardEntry) => {
      setViewingPlayer(entry);
  };

  const getRankStyle = (rank: number, isGodMode?: boolean) => {
    if (isGodMode) return "border-purple-500 bg-purple-900/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]";
    switch (rank) {
      case 1: return "border-yellow-400 bg-yellow-900/20 shadow-[0_0_10px_rgba(250,204,21,0.2)]";
      case 2: return "border-slate-300 bg-slate-800/40";
      case 3: return "border-orange-400 bg-orange-900/20";
      default: return "border-cyan-900/50 bg-slate-900/40";
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-scale-in">
      <div className="raphael-panel w-full max-w-2xl h-[85vh] rounded-lg border border-cyan-500/50 flex flex-col">
        <div className="bg-cyan-950/80 p-4 border-b border-cyan-500/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <span className="text-xl">🏆</span>
             <div>
                 <h2 className="text-xl font-bold text-cyan-100 system-font tracking-widest whitespace-nowrap leading-none">
                    CAO THỦ CHUYỂN SINH
                 </h2>
                 <span className="text-[10px] text-cyan-500 font-mono tracking-widest">RANKING SYSTEM :: {serverName}</span>
             </div>
          </div>
          <Button onClick={onClose} variant="ghost" className="text-cyan-400 whitespace-nowrap hover:text-white px-2">✕</Button>
        </div>

        <div className="flex text-[9px] text-cyan-600 font-bold uppercase tracking-widest px-4 py-2 border-b border-cyan-900/30 bg-slate-900/50">
            <div className="w-10 text-center">Rank</div>
            <div className="flex-1 pl-12">Định danh</div>
            <div className="w-24 text-right">Sức mạnh</div>
            <div className="w-12 text-right">Tuổi</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {isLoading ? <div className="text-center text-cyan-400 mt-10">Đang đồng bộ dữ liệu...</div> : 
             data.map((entry) => (
                <div 
                    key={entry.id}
                    onClick={() => handleUserClick(entry)}
                    className={`relative grid grid-cols-12 gap-2 items-center p-3 rounded border transition-all cursor-pointer hover:brightness-110 ${getRankStyle(entry.rank, entry.isGodMode)}`}
                >
                    <div className="col-span-2 text-center">
                        {entry.isGodMode ? <span className="text-purple-400 text-xl font-black">∞</span> : <span className={`text-lg font-bold ${entry.rank <= 3 ? 'text-white' : 'text-slate-400'}`}>{entry.rank}</span>}
                    </div>
                    
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border shrink-0 overflow-hidden ${entry.isOnline ? 'border-green-500 shadow-[0_0_5px_#22c55e]' : 'border-slate-600 grayscale'}`}>
                             {entry.customAvatar ? <img src={entry.customAvatar} className="w-full h-full object-cover"/> : <span className="text-lg">{entry.avatar}</span>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className={`font-bold truncate text-sm flex items-center gap-1 whitespace-nowrap ${entry.isCurrentUser ? 'text-yellow-300' : 'text-cyan-100'}`}>
                                {entry.username}
                                {entry.isGodMode && <span className="text-[8px] bg-purple-900/80 text-purple-200 border border-purple-500 px-1 rounded">GOD</span>}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate uppercase tracking-wider">{entry.race}</span>
                        </div>
                    </div>
                    
                    <div className="col-span-3 text-right text-xs font-mono text-cyan-200 whitespace-nowrap font-bold">
                        {entry.isGodMode ? "∞" : entry.powerLevel.toLocaleString()}
                    </div>
                    
                    <div className="col-span-1 text-right font-bold text-[10px] text-slate-500 whitespace-nowrap">{entry.daysSurvived}d</div>

                    {selectedUserForMenu === entry.username && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 bg-slate-900/90 border border-cyan-500 rounded-lg p-1.5 animate-scale-in shadow-xl backdrop-blur-md">
                            {/* INSPECT BUTTON - AVAILABLE FOR EVERYONE */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); handleInspect(entry); }} 
                                className="flex flex-col items-center justify-center w-10 h-10 rounded hover:bg-cyan-900/50 text-cyan-400 hover:text-white transition-colors gap-0.5" 
                                title="Soi Thông Tin"
                            >
                                <span className="text-lg">👁</span>
                                <span className="text-[8px] font-bold">SOI</span>
                            </button>

                            {/* CHALLENGE BUTTON - NOT FOR SELF */}
                            {!entry.isCurrentUser && (
                                <div className="h-6 w-[1px] bg-cyan-800 mx-1"></div>
                            )}
                            
                            {!entry.isCurrentUser && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleChallenge(entry); }} 
                                    className="flex flex-col items-center justify-center w-10 h-10 rounded hover:bg-red-900/50 text-red-500 hover:text-red-200 transition-colors gap-0.5" 
                                    title="Thách Đấu"
                                >
                                    <span className="text-lg">⚔</span>
                                    <span className="text-[8px] font-bold">ĐẤU</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
             ))
            }
        </div>
        
        {/* Player Details Modal integrated within Leaderboard */}
        {viewingPlayer && viewingPlayer.saveData && viewingPlayer.saveData.character && (
            <PlayerDetailModal
                username={viewingPlayer.username}
                avatar={viewingPlayer.saveData.character.name.charAt(0)}
                customAvatar={viewingPlayer.saveData.character.customAvatar}
                race={viewingPlayer.saveData.character.race}
                status={viewingPlayer.saveData.character.status}
                onClose={() => setViewingPlayer(null)}
            />
        )}
      </div>
    </div>
  );
};
