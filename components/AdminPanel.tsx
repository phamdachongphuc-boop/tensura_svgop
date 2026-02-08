
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Button } from './Button';
import { Character, GAME_SERVERS, BattleState } from '../types';
import { LeaderboardModal } from './LeaderboardModal';
import { PlayerDetailModal } from './PlayerDetailModal';

interface Props {
  onLogout: () => void;
  onEnterGame: () => void; 
}

const RANKS = [
    { id: 'GOD', label: 'GENESIS (Thần Thoại)', color: 'text-fuchsia-400 border-fuchsia-500' },
    { id: 'SS', label: 'MYTHICAL (Huyền Thoại)', color: 'text-red-500 border-red-500' },
    { id: 'S', label: 'LEGENDARY (Truyền Thuyết)', color: 'text-yellow-400 border-yellow-500' },
    { id: 'A', label: 'EPIC (Sử Thi)', color: 'text-purple-400 border-purple-500' },
    { id: 'B', label: 'RARE (Hiếm)', color: 'text-blue-400 border-blue-500' },
    { id: 'C', label: 'COMMON (Thường)', color: 'text-slate-300 border-slate-500' },
];

export const AdminPanel: React.FC<Props> = ({ onLogout, onEnterGame }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentServerName, setCurrentServerName] = useState(authService.getServerName());
  
  const [showPlayerListModal, setShowPlayerListModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showSQLModal, setShowSQLModal] = useState(false);
  const [showBattleManager, setShowBattleManager] = useState(false);
  const [showEditStatsModal, setShowEditStatsModal] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Battle Management State
  const [activeBattles, setActiveBattles] = useState<BattleState[]>([]);
  const [battleEdits, setBattleEdits] = useState<Record<number, {p1: number, p2: number}>>({});
  
  // Detail Modal State
  const [viewingPlayer, setViewingPlayer] = useState<any | null>(null);

  const [deleteConfirmationTarget, setDeleteConfirmationTarget] = useState<string | null>(null);
  
  // Gift System State
  const [giftTarget, setGiftTarget] = useState<string | null>(null);
  const [giftType, setGiftType] = useState<'SKILL' | 'ITEM'>('ITEM');
  const [giftName, setGiftName] = useState('');
  const [giftRank, setGiftRank] = useState('S');
  const [giftDescription, setGiftDescription] = useState('');
  const [giftUsage, setGiftUsage] = useState('');
  const [giftMessage, setGiftMessage] = useState('Phần thưởng tối cao từ Đấng Sáng Tạo.');

  // Stats Edit State
  const [statsTarget, setStatsTarget] = useState<string | null>(null);
  const [editingStats, setEditingStats] = useState({ hp: 0, maxHp: 0, mp: 0, maxMp: 0, str: 0, mag: 0 });

  const refreshUsers = async () => {
    setIsLoading(true);
    const allUsers = await authService.getAllUsers();
    setUsers(allUsers);
    setIsLoading(false);
  };

  const refreshBattles = async () => {
      const battles = await authService.getAdminActiveBattles();
      setActiveBattles(battles);
      // Initialize edit state with current values
      const initialEdits: any = {};
      battles.forEach(b => {
          initialEdits[b.id] = { p1: b.p1_hp, p2: b.p2_hp };
      });
      setBattleEdits(initialEdits);
  };

  useEffect(() => {
    if (showPlayerListModal) {
        refreshUsers();
    }
  }, [showPlayerListModal]);

  useEffect(() => {
      if (showBattleManager) {
          refreshBattles();
      }
  }, [showBattleManager]);

  const handleSwitchServer = (serverId: string) => {
      authService.setServer(serverId);
      setCurrentServerName(authService.getServerName());
      if (showPlayerListModal) refreshUsers();
      if (showBattleManager) refreshBattles();
  };

  const handleViewDetails = async (e: React.MouseEvent, user: any) => {
      e.stopPropagation();
      setViewingPlayer(user);
  };

  const handleBanToggle = async (e: React.MouseEvent, username: string, isBanned: boolean) => {
      e.stopPropagation();
      const action = isBanned ? "MỞ KHÓA" : "BAN";
      if (window.confirm(`Xác nhận ${action} tài khoản [${username}]?`)) {
          if (isBanned) {
              await authService.unbanUser(username);
          } else {
              await authService.banUser(username);
          }
          await refreshUsers();
      }
  };

  const handleUnbanAll = async () => {
      if (window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn MỞ KHÓA (UNBAN) cho TẤT CẢ tài khoản không?")) {
          await authService.unbanAllUsers();
          await refreshUsers();
          alert("Đã mở khóa toàn bộ tài khoản bị cấm.");
      }
  };

  const handleDeleteClick = (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      setDeleteConfirmationTarget(username);
  };

  const executeDelete = async () => {
      if (deleteConfirmationTarget) {
          await authService.adminDeleteUser(deleteConfirmationTarget);
          await refreshUsers();
          setDeleteConfirmationTarget(null);
      }
  };

  const handleEditStatsClick = async (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      const data = await authService.loadGameData(username);
      if (data && data.character) {
          setStatsTarget(username);
          setEditingStats({
              hp: data.character.status.hp,
              maxHp: data.character.status.maxHp,
              mp: data.character.status.mp,
              maxMp: data.character.status.maxMp,
              str: data.character.attributes.strength,
              mag: data.character.attributes.magic
          });
          setShowEditStatsModal(true);
      } else {
          alert("Người chơi chưa tạo nhân vật hoặc lỗi dữ liệu.");
      }
  };

  const handleSaveStats = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!statsTarget) return;
      
      const data = await authService.loadGameData(statsTarget);
      if (data && data.character) {
          data.character.status.hp = Number(editingStats.hp);
          data.character.status.maxHp = Number(editingStats.maxHp);
          data.character.status.mp = Number(editingStats.mp);
          data.character.status.maxMp = Number(editingStats.maxMp);
          data.character.attributes.strength = Number(editingStats.str);
          data.character.attributes.magic = Number(editingStats.mag);
          
          await authService.saveGameData(statsTarget, data);
          alert(`Đã cập nhật chỉ số cho [${statsTarget}] thành công!`);
          setShowEditStatsModal(false);
          setStatsTarget(null);
          refreshUsers();
      }
  };

  const handleGiftClick = (e: React.MouseEvent, username: string) => {
      e.stopPropagation();
      setGiftTarget(username);
      setGiftName('');
      setGiftRank('S');
      setGiftDescription('Một vật phẩm bí ẩn chứa đựng sức mạnh to lớn.');
      setGiftUsage('Kích hoạt để nhận sức mạnh.');
      setGiftMessage('Phần quà đặc biệt trao bởi Admin. Chúc bạn may mắn trong hành trình chuyển sinh.');
      setShowGiftModal(true);
  };

  const applyGodPreset = () => {
      setGiftType('ITEM');
      setGiftRank('GOD');
      setGiftName('[ ∞ ] Chân Lý Thế Giới');
      setGiftDescription('Quyền năng tối thượng của Đấng Sáng Tạo. Cho phép người sở hữu phá vỡ mọi quy luật, sinh mệnh vô hạn và năng lượng vô tận.');
      setGiftUsage('Tự động kích hoạt khi sở hữu. Ban quyền năng Admin/God Mode.');
      setGiftMessage('Ngươi đã được chọn để trở thành một vị thần mới.');
  };

  const handleSendGift = async (e: React.FormEvent) => {
      e.preventDefault();
      if (giftTarget && giftName) {
          if (giftName.includes("∞") || giftRank === 'GOD') {
             if (giftName.includes("∞")) {
                 const targetData = await authService.loadGameData(giftTarget);
                 if (targetData && targetData.character) {
                     const GOD_HP = 1_000_000_000_000_000;
                     targetData.character.status.hp = GOD_HP;
                     targetData.character.status.maxHp = GOD_HP;
                     targetData.character.status.mp = GOD_HP;
                     targetData.character.status.maxMp = GOD_HP;
                     targetData.character.status.isGodMode = true;
                     targetData.character.status.evolutionStage = "∞ THE CREATOR ∞";
                     await authService.saveGameData(giftTarget, targetData);
                     alert(`Đã kích hoạt chế độ VÔ HẠN (GOD MODE) cho người chơi [${giftTarget}]!`);
                 }
             }
          }

          const rankLabel = RANKS.find(r => r.id === giftRank)?.label || giftRank;
          const formattedContent = `${giftMessage}\n\n=== 📜 THÔNG TIN CHI TIẾT ===\n• Cấp độ: [ ${rankLabel} ]\n• Mô tả: ${giftDescription}\n• Cách dùng: ${giftUsage}`;
          const formattedAttachmentName = `[${giftRank}] ${giftName}`;

          await authService.sendMail(giftTarget, {
              sender: "Admin System",
              title: "Quà tặng từ Admin",
              content: formattedContent,
              type: giftType,
              attachment: formattedAttachmentName
          });

          alert(`Đã gửi ${giftType} "${formattedAttachmentName}" cho ${giftTarget}`);
          setShowGiftModal(false);
          setGiftTarget(null);
      }
  };

  // Battle Management Actions
  const handleStopBattle = async (id: number) => {
      if (confirm("Dừng trận đấu này? Kết quả sẽ là hệ thống can thiệp.")) {
          await authService.adminStopBattle(id);
          refreshBattles();
      }
  };

  const handleDeleteBattle = async (id: number) => {
      if (confirm("Xóa trận đấu này khỏi hệ thống? Dữ liệu sẽ biến mất.")) {
          await authService.adminDeleteBattle(id);
          refreshBattles();
      }
  };

  const handleUpdateBattleHP = async (battleId: number) => {
      const edit = battleEdits[battleId];
      if (edit) {
          await authService.adminUpdateBattleStats(battleId, Number(edit.p1), Number(edit.p2));
          alert("Đã cập nhật HP trận đấu.");
          refreshBattles();
      }
  };

  const dummyAdminChar: Character = {
      name: "pojani0b",
      race: "True Dragon",
      uniqueSkill: "Absolute Admin Privilege",
      reincarnationReason: "Ultimate Creator",
      location: "Void Realm",
      attributes: { strength: 99999, magic: 99999, agility: 99999, defense: 99999 },
      status: { 
          hp: 99999, maxHp: 99999, mp: 99999, maxMp: 99999, 
          skills: [], equippedSkills: [], activeEffects: [], inventory: [], 
          quests: [],
          level: 1000, evolutionStage: "SUPREME GOD",
          difficulty: 'NORMAL'
      }
  };

  // Filter logic
  const filteredUsers = users.filter(u => {
      const searchLower = searchTerm.toLowerCase();
      const usernameMatch = u.username.toLowerCase().includes(searchLower);
      const charNameMatch = u.saveData?.character?.name.toLowerCase().includes(searchLower);
      return usernameMatch || charNameMatch;
  });

  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-slate-900 text-white font-mono relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%, transparent 75%, #1e293b 75%, #1e293b)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}>
        </div>

        <div className="w-full max-w-6xl relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-800/90 p-6 rounded border border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] gap-6 backdrop-blur-md">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-red-500 system-font tracking-widest text-glow whitespace-nowrap">ADMINISTRATOR</h1>
                    <p className="text-sm text-red-300 font-mono tracking-[0.3em] mt-1 whitespace-nowrap">ACCESS LEVEL: SUPREME</p>
                    <div className="mt-2 text-xs text-yellow-500 font-bold border border-yellow-800 bg-yellow-900/30 px-2 py-1 inline-block rounded whitespace-nowrap">
                        ACTIVE SERVER: {currentServerName}
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                    <Button onClick={() => setShowBattleManager(true)} variant="secondary" className="border-red-500 text-red-300 shadow-[0_0_15px_rgba(220,38,38,0.3)] bg-red-900/20 hover:bg-red-900/50 whitespace-nowrap">
                        ⚔ QUẢN LÝ TRẬN ĐẤU
                    </Button>
                    <Button onClick={() => setShowSQLModal(true)} variant="secondary" className="border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-900/20 hover:bg-purple-900/50 whitespace-nowrap">
                        🛠 SETUP DB
                    </Button>
                    <Button onClick={onEnterGame} variant="primary" className="border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] whitespace-nowrap">
                        🎮 VÀO GAME
                    </Button>
                    <Button onClick={onLogout} variant="danger" className="whitespace-nowrap">
                        ĐĂNG XUẤT
                    </Button>
                </div>
            </div>

            <div className="mb-8 p-4 bg-slate-800/80 border border-cyan-800 rounded flex flex-wrap gap-2 justify-center">
                 <span className="w-full text-center text-xs text-cyan-600 uppercase font-bold tracking-widest mb-1 whitespace-nowrap">SERVER CONTROL</span>
                 {GAME_SERVERS.map(sv => (
                     <button
                        key={sv.id}
                        onClick={() => handleSwitchServer(sv.id)}
                        disabled={sv.status === 'MAINTENANCE'}
                        className={`px-4 py-2 text-xs font-bold rounded border transition-all whitespace-nowrap ${
                            authService.getServerId() === sv.id 
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                            : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                        }`}
                     >
                         {sv.name}
                     </button>
                 ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <button 
                    onClick={() => setShowPlayerListModal(true)}
                    className="group relative h-40 bg-slate-800 border-2 border-cyan-600 rounded-lg overflow-hidden hover:bg-slate-700 transition-all shadow-[0_0_20px_rgba(8,145,178,0.2)] flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">👥</div>
                    <span className="text-xl font-bold text-cyan-300 system-font tracking-widest group-hover:text-cyan-100 whitespace-nowrap">QUẢN LÝ USER</span>
                    <span className="text-[10px] text-cyan-600 uppercase whitespace-nowrap">In {currentServerName}</span>
                </button>

                <button 
                    onClick={() => setShowLeaderboard(true)}
                    className="group relative h-40 bg-slate-800 border-2 border-yellow-600 rounded-lg overflow-hidden hover:bg-slate-700 transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] flex flex-col items-center justify-center gap-3"
                >
                    <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors"></div>
                    <div className="text-5xl group-hover:scale-110 transition-transform duration-300">🏆</div>
                    <span className="text-xl font-bold text-yellow-300 system-font tracking-widest group-hover:text-yellow-100 whitespace-nowrap">BẢNG XẾP HẠNG</span>
                    <span className="text-[10px] text-yellow-600 uppercase whitespace-nowrap">Ranking of {currentServerName}</span>
                </button>
            </div>
        </div>

        {/* --- MODALS --- */}

        {showBattleManager && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-5xl h-[80vh] flex flex-col border-2 border-red-500 shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                    <div className="bg-red-950/90 p-4 border-b border-red-700 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">⚔</span>
                            <div>
                                <h2 className="text-xl font-bold text-red-100 system-font tracking-widest">QUẢN LÝ ĐẤU TRƯỜNG</h2>
                                <div className="text-[10px] text-red-400">ACTIVE PVP SESSIONS</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={refreshBattles} className="text-xs text-red-300 hover:text-white px-2">↻ Làm mới</button>
                            <Button onClick={() => setShowBattleManager(false)} variant="ghost" className="text-red-500 border-red-800">ĐÓNG</Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-900/50 space-y-3">
                        {activeBattles.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10">Không có trận đấu nào đang diễn ra.</div>
                        ) : (
                            activeBattles.map(battle => {
                                const editState = battleEdits[battle.id] || { p1: battle.p1_hp, p2: battle.p2_hp };
                                
                                return (
                                    <div key={battle.id} className="bg-slate-800/60 border border-red-900/50 p-4 rounded flex flex-col gap-4">
                                        
                                        {/* Status Header */}
                                        <div className="flex justify-between items-start border-b border-white/5 pb-2">
                                            <div className="text-xs text-slate-400 font-mono">
                                                ID: {battle.id} | Status: <span className="text-white">{battle.status}</span> | Turn: {battle.turn}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => handleStopBattle(battle.id)} className="text-[10px] py-1 px-2 bg-yellow-900/30 border-yellow-600 text-yellow-500">
                                                    DỪNG (HÒA)
                                                </Button>
                                                <Button onClick={() => handleDeleteBattle(battle.id)} className="text-[10px] py-1 px-2 bg-red-900/30 border-red-600 text-red-500">
                                                    XÓA (HỦY)
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Live HP Edit */}
                                        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
                                            {/* Player 1 */}
                                            <div className="flex-1 w-full bg-black/30 p-2 rounded border border-cyan-900/30">
                                                <div className="text-cyan-400 font-bold mb-1">{battle.challenger}</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500">HP:</span>
                                                    <input 
                                                        type="number" 
                                                        value={editState.p1}
                                                        onChange={(e) => setBattleEdits({...battleEdits, [battle.id]: {...editState, p1: Number(e.target.value)}})}
                                                        className="w-24 bg-slate-900 border border-slate-600 text-white text-xs px-2 py-1 rounded focus:border-cyan-500 outline-none"
                                                    />
                                                    <span className="text-[10px] text-slate-500">/ {battle.p1_max_hp}</span>
                                                </div>
                                            </div>

                                            <div className="text-red-500 font-black italic text-xl">VS</div>

                                            {/* Player 2 */}
                                            <div className="flex-1 w-full bg-black/30 p-2 rounded border border-red-900/30">
                                                <div className="text-red-400 font-bold mb-1 text-right">{battle.target}</div>
                                                <div className="flex items-center gap-2 justify-end">
                                                    <span className="text-[10px] text-slate-500">/ {battle.p2_max_hp}</span>
                                                    <input 
                                                        type="number" 
                                                        value={editState.p2}
                                                        onChange={(e) => setBattleEdits({...battleEdits, [battle.id]: {...editState, p2: Number(e.target.value)}})}
                                                        className="w-24 bg-slate-900 border border-slate-600 text-white text-xs px-2 py-1 rounded focus:border-red-500 outline-none text-right"
                                                    />
                                                    <span className="text-[10px] text-slate-500">HP:</span>
                                                </div>
                                            </div>
                                            
                                            {/* Save Button */}
                                            <Button 
                                                onClick={() => handleUpdateBattleHP(battle.id)}
                                                className="h-full py-4 px-2 bg-green-900/20 border-green-600 text-green-400 hover:bg-green-900/50"
                                                title="Lưu HP"
                                            >
                                                💾
                                            </Button>
                                        </div>

                                        {/* Logs */}
                                        <div className="text-[10px] text-slate-500 bg-black/30 p-2 rounded max-h-20 overflow-y-auto">
                                            {battle.logs && battle.logs.length > 0 ? (
                                                battle.logs.slice(-3).map((l: any, i) => (
                                                    <div key={i}>[{l.turn}] {l.actor}: {l.description}</div>
                                                ))
                                            ) : "Chưa có log..."}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {showEditStatsModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-lg p-6 rounded border-2 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)] relative">
                    <h3 className="text-xl font-bold text-green-400 mb-6 text-center system-font tracking-widest uppercase">
                        ĐIỀU KHIỂN CHỈ SỐ: <span className="text-white">{statsTarget}</span>
                    </h3>
                    
                    <form onSubmit={handleSaveStats} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-900/20 p-3 rounded border border-red-900/50">
                                <label className="block text-[10px] text-red-400 font-bold mb-1 uppercase">HP Hiện Tại</label>
                                <input 
                                    type="number" 
                                    value={editingStats.hp} 
                                    onChange={e => setEditingStats({...editingStats, hp: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-red-500 text-sm font-mono" 
                                />
                            </div>
                            <div className="bg-red-900/20 p-3 rounded border border-red-900/50">
                                <label className="block text-[10px] text-red-400 font-bold mb-1 uppercase">Max HP</label>
                                <input 
                                    type="number" 
                                    value={editingStats.maxHp} 
                                    onChange={e => setEditingStats({...editingStats, maxHp: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-red-500 text-sm font-mono" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50">
                                <label className="block text-[10px] text-blue-400 font-bold mb-1 uppercase">MP Hiện Tại</label>
                                <input 
                                    type="number" 
                                    value={editingStats.mp} 
                                    onChange={e => setEditingStats({...editingStats, mp: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-blue-500 text-sm font-mono" 
                                />
                            </div>
                            <div className="bg-blue-900/20 p-3 rounded border border-blue-900/50">
                                <label className="block text-[10px] text-blue-400 font-bold mb-1 uppercase">Max MP</label>
                                <input 
                                    type="number" 
                                    value={editingStats.maxMp} 
                                    onChange={e => setEditingStats({...editingStats, maxMp: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-blue-500 text-sm font-mono" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                            <div>
                                <label className="block text-[10px] text-yellow-500 font-bold mb-1 uppercase">Sức Mạnh (STR)</label>
                                <input 
                                    type="number" 
                                    value={editingStats.str} 
                                    onChange={e => setEditingStats({...editingStats, str: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-yellow-500 text-sm font-mono" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-purple-500 font-bold mb-1 uppercase">Ma Lực (MAG)</label>
                                <input 
                                    type="number" 
                                    value={editingStats.mag} 
                                    onChange={e => setEditingStats({...editingStats, mag: Number(e.target.value)})}
                                    className="w-full bg-slate-900 border border-slate-700 p-2 text-white outline-none rounded focus:border-purple-500 text-sm font-mono" 
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-800">
                            <Button type="button" onClick={() => setShowEditStatsModal(false)} variant="ghost">HỦY BỎ</Button>
                            <Button type="submit" variant="primary" className="border-green-500 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.4)] px-8 bg-green-700 hover:bg-green-600">
                                CẬP NHẬT
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showSQLModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-2xl h-[80vh] flex flex-col border border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)]">
                    <div className="bg-purple-950/80 p-4 border-b border-purple-700 flex justify-between items-center shrink-0">
                        <h2 className="text-xl font-bold text-purple-100 whitespace-nowrap">HƯỚNG DẪN SETUP DATABASE</h2>
                        <Button onClick={() => setShowSQLModal(false)} variant="ghost" className="text-purple-300 border-purple-800">ĐÓNG</Button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 bg-slate-900/90 text-sm space-y-4">
                        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 text-red-200">
                            <strong>LƯU Ý:</strong> Chạy lệnh này trên Supabase SQL Editor để tạo bảng mới hoặc cập nhật cấu trúc.
                        </div>
                        <div>
                            <label className="block text-cyan-400 font-bold mb-2">QUERY TẠO BẢNG & INDEX</label>
                            <textarea readOnly className="w-full h-64 bg-black border border-slate-700 text-green-400 font-mono p-3 text-xs"
                                value={authService.getDatabaseSetupSQL()}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showPlayerListModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-5xl h-[85vh] rounded-lg border border-cyan-500/50 flex flex-col relative overflow-hidden">
                    <div className="bg-cyan-950/90 p-4 border-b border-cyan-700 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">👥</span>
                            <div>
                                <h2 className="text-xl font-bold text-cyan-100 system-font tracking-widest whitespace-nowrap">DANH SÁCH USER</h2>
                                <div className="text-[10px] text-yellow-500 whitespace-nowrap">{currentServerName}</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleUnbanAll} className="px-3 py-1 bg-green-900/50 border border-green-600 text-green-300 rounded hover:bg-green-800 text-xs font-bold animate-pulse">
                                🔓 UNBAN ALL
                            </button>
                            <Button onClick={() => setShowPlayerListModal(false)} variant="ghost" className="text-cyan-500 border-cyan-800">ĐÓNG</Button>
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="p-3 border-b border-cyan-800/50 bg-slate-900/80 flex gap-2">
                        <input 
                            type="text" 
                            placeholder="🔍 Tìm kiếm bằng Username hoặc Tên nhân vật..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                        <button onClick={refreshUsers} className="px-4 bg-cyan-900/50 border border-cyan-700 text-cyan-300 rounded hover:bg-cyan-800">
                            ↻ Refresh
                        </button>
                    </div>

                    {/* HEADER ROW */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-slate-800/80 border-b border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="col-span-1 text-center">Avatar</div>
                        <div className="col-span-3">Định Danh / Info</div>
                        <div className="col-span-2 text-center">Sức Mạnh</div>
                        <div className="col-span-2 text-center">Trạng Thái</div>
                        <div className="col-span-4 text-right pr-4">Hành Động</div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full"><div className="animate-spin h-8 w-8 border-4 border-cyan-500 rounded-full border-t-transparent"></div></div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center text-slate-500 mt-10">Không tìm thấy user nào khớp với "{searchTerm}".</div>
                        ) : (
                            filteredUsers.map((user) => {
                                const char = user.saveData?.character;
                                const isBanned = user.isBanned;
                                const isOnline = (Date.now() - (user.lastActive || 0)) < 5 * 60 * 1000;
                                const power = char ? (char.status.hp + char.status.mp + char.attributes.strength * 10) : 0;

                                return (
                                    <div 
                                        key={user.username}
                                        className={`grid grid-cols-12 gap-2 items-center p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${isBanned ? 'opacity-50 grayscale bg-red-900/10' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className="col-span-1 flex justify-center">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border bg-slate-800 border-slate-600 overflow-hidden">
                                                {char && char.customAvatar ? <img src={char.customAvatar} className="w-full h-full object-cover"/> : (char ? char.name.charAt(0).toUpperCase() : '?')}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="col-span-3 min-w-0">
                                            <div className="font-bold text-cyan-100 truncate text-sm">{user.username}</div>
                                            <div className="text-xs text-slate-400 truncate">{char ? `${char.name} (${char.race})` : 'Chưa tạo nhân vật'}</div>
                                        </div>

                                        {/* Stats */}
                                        <div className="col-span-2 text-center">
                                            <div className="text-yellow-500 font-mono text-xs font-bold">{char?.status?.isGodMode ? '∞ GOD' : power.toLocaleString()}</div>
                                            <div className="text-[9px] text-slate-500">POWER</div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-2 flex flex-col items-center gap-1">
                                            {isBanned ? (
                                                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded border border-red-400 font-bold">BANNED</span>
                                            ) : isOnline ? (
                                                <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-600 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> ONLINE
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-500">OFFLINE</span>
                                            )}
                                        </div>

                                        {/* Actions Grid */}
                                        <div className="col-span-4 flex justify-end gap-2 pr-2">
                                            {/* Details */}
                                            {char && (
                                                <button onClick={(e) => handleViewDetails(e, user)} className="w-8 h-8 flex items-center justify-center bg-blue-900/20 border border-blue-500/50 rounded hover:bg-blue-900/50 text-blue-300 transition-all" title="Soi Chi Tiết">
                                                    👁
                                                </button>
                                            )}
                                            
                                            {/* Edit Stats */}
                                            {char && (
                                                <button onClick={(e) => handleEditStatsClick(e, user.username)} className="w-8 h-8 flex items-center justify-center bg-green-900/20 border border-green-500/50 rounded hover:bg-green-900/50 text-green-300 transition-all" title="Chỉnh Sửa Chỉ Số">
                                                    🩸
                                                </button>
                                            )}

                                            {/* Gift */}
                                            <button onClick={(e) => handleGiftClick(e, user.username)} className="w-8 h-8 flex items-center justify-center bg-yellow-900/20 border border-yellow-500/50 rounded hover:bg-yellow-900/50 text-yellow-300 transition-all" title="Tặng Quà">
                                                🎁
                                            </button>

                                            {/* Ban/Unban */}
                                            <button onClick={(e) => handleBanToggle(e, user.username, !!isBanned)} className={`w-8 h-8 flex items-center justify-center border rounded transition-all ${isBanned ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-slate-700/50 border-slate-500 text-slate-400 hover:bg-red-900/30 hover:border-red-500 hover:text-red-400'}`} title={isBanned ? "Mở khóa" : "Ban"}>
                                                {isBanned ? '🔓' : '🚫'}
                                            </button>

                                            {/* Delete */}
                                            <button onClick={(e) => handleDeleteClick(e, user.username)} className="w-8 h-8 flex items-center justify-center bg-red-900/20 border border-red-500/50 rounded hover:bg-red-900/50 text-red-500 transition-all" title="Xóa Tài Khoản">
                                                ❌
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Player Details Modal */}
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

        {deleteConfirmationTarget && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-md p-6 border-2 border-red-600 text-center">
                    <h3 className="text-xl font-bold text-red-500 mb-6 tracking-widest whitespace-nowrap">XÁC NHẬN XÓA</h3>
                    <p className="text-cyan-100 mb-8 whitespace-nowrap">Bạn có chắc chắn muốn xóa user này khỏi hệ thống online?</p>
                    <div className="flex gap-4 justify-center">
                        <Button onClick={() => setDeleteConfirmationTarget(null)} variant="secondary">KHÔNG</Button>
                        <Button onClick={executeDelete} variant="danger">CÓ</Button>
                    </div>
                </div>
            </div>
        )}

        {showGiftModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in p-4">
                <div className="raphael-panel w-full max-w-lg p-6 rounded border-2 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)] relative flex flex-col h-[90vh] md:h-auto">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-yellow-400 system-font tracking-widest text-glow">
                             TRAO QUYỀN NĂNG
                        </h3>
                        <div className="text-[10px] text-yellow-700 font-mono mt-1">
                             TARGET: <span className="text-white font-bold">{giftTarget}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSendGift} className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                        {/* Type Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`cursor-pointer border p-3 rounded text-center transition-all ${giftType === 'ITEM' ? 'bg-yellow-900/40 border-yellow-500 text-yellow-100' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                <input type="radio" className="hidden" checked={giftType === 'ITEM'} onChange={() => setGiftType('ITEM')} />
                                <div className="text-xl mb-1">🎁</div>
                                <div className="text-xs font-bold uppercase">Vật phẩm</div>
                            </label>
                            <label className={`cursor-pointer border p-3 rounded text-center transition-all ${giftType === 'SKILL' ? 'bg-purple-900/40 border-purple-500 text-purple-100' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                <input type="radio" className="hidden" checked={giftType === 'SKILL'} onChange={() => setGiftType('SKILL')} />
                                <div className="text-xl mb-1">⚡</div>
                                <div className="text-xs font-bold uppercase">Kỹ năng</div>
                            </label>
                        </div>

                        {/* Rank Selection */}
                        <div>
                            <label className="block text-[10px] text-yellow-600 font-bold mb-1 uppercase tracking-widest">CẤP ĐỘ (RANK)</label>
                            <select 
                                value={giftRank} 
                                onChange={e => setGiftRank(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded focus:border-yellow-500 outline-none text-sm"
                            >
                                {RANKS.map(rank => (
                                    <option key={rank.id} value={rank.id}>{rank.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Name Input with God Mode Preset */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] text-yellow-600 font-bold uppercase tracking-widest">TÊN {giftType === 'ITEM' ? 'VẬT PHẨM' : 'KỸ NĂNG'}</label>
                                <button type="button" onClick={applyGodPreset} className="text-[9px] bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-200 px-2 py-0.5 rounded hover:bg-fuchsia-800 animate-pulse">
                                    [⚡ TẶNG GOD MODE ]
                                </button>
                            </div>
                            <input 
                                type="text" 
                                value={giftName} 
                                onChange={e => setGiftName(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 p-3 text-white outline-none rounded focus:border-yellow-500 placeholder-slate-600" 
                                placeholder="VD: Kiếm Hư Không..." 
                                required 
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-[10px] text-yellow-600 font-bold mb-1 uppercase tracking-widest">MÔ TẢ CHI TIẾT</label>
                            <textarea 
                                value={giftDescription} 
                                onChange={e => setGiftDescription(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 p-3 text-white h-20 rounded resize-none focus:border-yellow-500 placeholder-slate-600 text-xs" 
                                placeholder="Mô tả về sức mạnh, nguồn gốc..." 
                                required 
                            />
                        </div>

                        {/* Usage */}
                        <div>
                            <label className="block text-[10px] text-yellow-600 font-bold mb-1 uppercase tracking-widest">HƯỚNG DẪN SỬ DỤNG</label>
                            <textarea 
                                value={giftUsage} 
                                onChange={e => setGiftUsage(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 p-3 text-white h-20 rounded resize-none focus:border-yellow-500 placeholder-slate-600 text-xs" 
                                placeholder="Cách kích hoạt, tiêu hao mana..." 
                                required 
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label className="block text-[10px] text-yellow-600 font-bold mb-1 uppercase tracking-widest">LỜI NHẮN TỪ ADMIN</label>
                            <textarea 
                                value={giftMessage} 
                                onChange={e => setGiftMessage(e.target.value)} 
                                className="w-full bg-slate-900 border border-slate-700 p-3 text-white h-16 rounded resize-none focus:border-yellow-500 text-xs italic" 
                                required 
                            />
                        </div>

                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-800">
                            <Button type="button" onClick={() => setShowGiftModal(false)} variant="ghost">HỦY BỎ</Button>
                            <Button type="submit" variant="primary" className="border-yellow-500 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.4)] px-8">
                                GỬI QUÀ
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showLeaderboard && (
            <LeaderboardModal currentUserCharacter={dummyAdminChar} onClose={() => setShowLeaderboard(false)} />
        )}
    </div>
  );
};
