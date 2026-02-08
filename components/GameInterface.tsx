
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Character, ChatMessage, GameState, SaveData, Mail, UserProfile } from '../types';
import { Button } from './Button';
import { StatusPanel } from './StatusPanel';
import { generateStoryResponse, analyzeCharacterStatus, appraiseTarget, AppraisalResult, scanSurroundings, RadarEntity, analyzeEntity, EntityAnalysis } from '../services/geminiService';
import { NotificationOverlay, Notification } from './NotificationOverlay';
import { AppraisalResultModal } from './AppraisalResult';
import { RadarDisplay } from './RadarDisplay';
import { InventoryModal } from './InventoryModal';
import { SkillEquipModal } from './SkillEquipModal';
import { AnalysisModal } from './AnalysisModal';
import { Typewriter } from './Typewriter';
import { GachaModal } from './GachaModal';
import { LeaderboardModal } from './LeaderboardModal';
import { MailboxModal } from './MailboxModal';
import { WorldChatModal } from './WorldChatModal';
import { GoldenNotification } from './GoldenNotification';
import { authService } from '../services/authService';

interface Props {
  initialCharacter: Character;
  initialHistory?: ChatMessage[];
  currentUser: UserProfile;
  onExit: () => void;
  onRestart: () => void;
  onSave: (data: SaveData) => Promise<{ success: boolean; error?: string }>; 
}

type SkillMode = 'SENSE' | 'LUCKY';
type AppraisalMode = 'APPRAISAL' | 'THOUGHT';

export const GameInterface: React.FC<Props> = ({ initialCharacter, initialHistory, currentUser, onExit, onRestart, onSave }) => {
  const [character, setCharacter] = useState<Character>(initialCharacter);
  const [history, setHistory] = useState<ChatMessage[]>(initialHistory || []);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // DEATH STATES
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [deathPhase, setDeathPhase] = useState<'CAUSE' | 'CONFIRM'>('CAUSE');

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  // FIREWALL & NSFW
  const [isFirewallActive, setIsFirewallActive] = useState(true);
  const [isNSFW, setIsNSFW] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifCounter, setNotifCounter] = useState(0);

  // GOLDEN NOTIFICATION STATE
  const [goldenMsg, setGoldenMsg] = useState<string | null>(null);

  // Analysis State
  const [analyzingItem, setAnalyzingItem] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<EntityAnalysis | null>(null);

  // Appraisal & Thought State
  const [appraisalResult, setAppraisalResult] = useState<AppraisalResult | null>(null);
  const [isAppraising, setIsAppraising] = useState(false);

  // Radar State
  const [showRadar, setShowRadar] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [radarEntities, setRadarEntities] = useState<RadarEntity[]>([]);

  // Inventory State
  const [showInventory, setShowInventory] = useState(false);
  
  // Gacha State
  const [showGacha, setShowGacha] = useState(false);
  
  // Leaderboard State
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Mailbox State
  const [showMailbox, setShowMailbox] = useState(false);
  const [hasUnreadMail, setHasUnreadMail] = useState(false);

  // World Chat State
  const [showWorldChat, setShowWorldChat] = useState(false);

  // Skill Equip State
  const [showSkillEquip, setShowSkillEquip] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isDead = character.status.hp <= 0 && !character.status.isGodMode;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  useEffect(() => {
    // Stop autosave if dead to prevent death loops
    if (isDead) return;

    const autoSaveTimer = setTimeout(async () => {
        if (character && history.length > 0) {
            setIsAutoSaving(true);
            const saveData: SaveData = {
                character,
                chatHistory: history,
                lastSaved: Date.now()
            };
            await onSave(saveData);
            setTimeout(() => setIsAutoSaving(false), 1000);
        }
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [character, history, isDead, onSave]);

  useEffect(() => {
    const checkMail = async () => {
        const mails = await authService.getMailbox(currentUser.username);
        setHasUnreadMail(mails.some(m => !m.isRead));
    };
    checkMail();
    const interval = setInterval(checkMail, 20000);
    return () => clearInterval(interval);
  }, []);

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    const newNotif: Notification = { id: notifCounter, message, type: type as any };
    setNotifications(prev => [...prev, newNotif]);
    setNotifCounter(prev => prev + 1);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (history.length === 0) {
      const startIntro = async () => {
        setIsProcessing(true);
        const introPrompt = `KHỞI ĐẦU: Tôi là ${character.name}, chủng tộc ${character.race}. Vị trí: ${character.location}. Mô tả tình huống bắt đầu súc tích. Cảnh báo về sự nguy hiểm của thế giới.`;
        
        const response = await generateStoryResponse(character, [], introPrompt, isFirewallActive, isNSFW);
        setHistory([{ role: 'model', content: response, timestamp: Date.now() }]);
        setIsProcessing(false);
      };
      startIntro();
    }
  }, []); 

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing || isDead) return;

    const rawInput = input.trim();
    const command = rawInput.toLowerCase();
    
    // --- COMMANDS HANDLING ---
    if (command === 'mở' || command === 'unlock' || command === 'open') {
        setIsFirewallActive(false);
        addNotification("HỆ THỐNG: TƯỜNG LỬA ĐÃ VÔ HIỆU HÓA. CẨN TRỌNG.", 'warning');
        setHistory(prev => [...prev, { role: 'user', content: "[ADMIN COMMAND]: Unlock Firewall.", timestamp: Date.now() }]);
        setInput('');
        return;
    }
    
    if (command === 'đóng' || command === 'lock' || command === 'close') {
        setIsFirewallActive(true);
        setIsNSFW(false); // Lock implies safety
        addNotification("HỆ THỐNG: TƯỜNG LỬA BẢO VỆ ĐÃ KÍCH HOẠT (ON).", 'success');
        setHistory(prev => [...prev, { role: 'user', content: "[ADMIN COMMAND]: Lock Firewall.", timestamp: Date.now() }]);
        setInput('');
        return;
    }

    // NSFW TOGGLE
    if (command === 'nsfw') {
        if (isFirewallActive) {
            addNotification("LỖI: Tường lửa đang bật. Không thể kích hoạt chế độ không an toàn.", 'error');
            setInput('');
            return;
        }
        setIsNSFW(true);
        addNotification("CẢNH BÁO: CHẾ ĐỘ NSFW KÍCH HOẠT. NỘI DUNG NGƯỜI LỚN & BẠO LỰC ĐƯỢC CHO PHÉP.", 'warning');
        setHistory(prev => [...prev, { role: 'user', content: "[SYSTEM]: Enabling Unfiltered Mode (NSFW). Safety protocols disengaged.", timestamp: Date.now() }]);
        setInput('');
        return;
    }

    if (command === 'sfw' || command === 'normal') {
        setIsNSFW(false);
        addNotification("HỆ THỐNG: CHẾ ĐỘ AN TOÀN (SFW) ĐƯỢC KHÔI PHỤC.", 'success');
        setInput('');
        return;
    }
    // -------------------------

    const userMsg: ChatMessage = { role: 'user', content: rawInput, timestamp: Date.now() };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    const responseText = await generateStoryResponse(character, [...history, userMsg], userMsg.content, isFirewallActive, isNSFW);
    
    const modelMsg: ChatMessage = { role: 'model', content: responseText, timestamp: Date.now() };
    const newHistory = [...history, userMsg, modelMsg];
    setHistory(newHistory);
    setIsProcessing(false);
    
    handleUpdateStatus(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUpdateStatus = async (currentHistory = history) => {
    setIsUpdatingStatus(true);
    const prevStatus = { ...character.status };
    const newStatus = await analyzeCharacterStatus(character, currentHistory, isFirewallActive);
    
    // --- ABSOLUTE GOD MODE VALIDATION ---
    const hasGodToken = newStatus.inventory.some(item => item.includes("[ ∞ ]"));
    
    if (newStatus.isGodMode && !hasGodToken) {
        newStatus.isGodMode = false;
        // Cap stats if cheated
        if (newStatus.hp > 1000000) newStatus.hp = 9999;
        addNotification("CẢNH BÁO: PHÁT HIỆN GIAN LẬN. GOD MODE BỊ TỪ CHỐI.", "error");
    }

    if (newStatus.cheatDetected && isFirewallActive && !newStatus.isGodMode) {
        addNotification("CẢNH BÁO: TƯỜNG LỬA CHẶN HÀNH ĐỘNG PHI LOGIC!", 'error');
        // Do not update character if cheat detected by AI
        setIsUpdatingStatus(false);
        return; 
    }

    // --- GOLDEN NOTIFICATION LOGIC ---
    const newSkills = newStatus.skills.filter(s => !prevStatus.skills.includes(s));
    if (newSkills.length > 0) {
        setGoldenMsg(`TIẾN HÓA KỸ NĂNG: ${newSkills.join(', ')}`);
    }

    if (newStatus.evolutionStage !== prevStatus.evolutionStage) {
        setGoldenMsg(`TIẾN HÓA CHỦNG TỘC: ${newStatus.evolutionStage.toUpperCase()}`);
    }

    // Check for death condition
    if (newStatus.hp <= 0 && !newStatus.isGodMode) {
        if (prevStatus.hp > 0) {
            addNotification(`CẢNH BÁO: Sát thương chí mạng. HP về 0.`, 'warning');
            setDeathPhase('CAUSE');
            setShowDeathModal(true);
            setTimeout(() => {
                setDeathPhase('CONFIRM');
            }, 5000);
        }
    } 

    const { cheatDetected, ...cleanStatus } = newStatus;
    setCharacter(prev => ({ ...prev, status: cleanStatus }));
    setIsUpdatingStatus(false);
  };

  const handleAppraise = async () => {
    setIsAppraising(true);
    addNotification("BÁO CÁO: Đang kích hoạt kỹ năng Thẩm Định...", 'info');
    const result = await appraiseTarget(history);
    if (result) setAppraisalResult(result);
    setIsAppraising(false);
  };

  const handleAnalyzeEntity = async (term: string) => {
    addNotification(`BÁO CÁO: Đang phân tích "${term}"...`, 'info');
    const result = await analyzeEntity(term);
    if (result) {
      setAnalysisData(result);
    } else {
      addNotification("LỖI: Không thể phân tích đối tượng.", 'error');
    }
  };

  const handleToggleSkill = (skill: string) => {
    const isEquipped = character.status.equippedSkills.includes(skill);
    let newEquipped = [...character.status.equippedSkills];
    
    if (isEquipped) {
      newEquipped = newEquipped.filter(s => s !== skill);
      addNotification(`Hệ thống: Đã thu hồi kỹ năng [${skill}].`, 'info');
    } else {
      if (newEquipped.length >= 3) {
        addNotification("Hệ thống: Đã đạt giới hạn 3 kỹ năng trang bị.", 'warning');
        return;
      }
      newEquipped.push(skill);
      addNotification(`Hệ thống: Đã trang bị kỹ năng [${skill}].`, 'success');
    }
    
    setCharacter(prev => ({
      ...prev,
      status: { ...prev.status, equippedSkills: newEquipped }
    }));
  };

  const handleUseSkill = async (skill: string) => {
    if (isProcessing || isDead) return;
    
    const currentMp = character.status.mp;
    const isUltimate = ['Raphael', 'Uriel', 'Michael', 'Beelzebuth'].some(k => skill.includes(k));
    const manaCost = isUltimate ? Math.floor(character.status.maxMp * 0.5) : Math.floor(character.status.maxMp * 0.1);
    
    if (!character.status.isGodMode && currentMp < manaCost) {
        addNotification(`CẢNH BÁO: Ma lực không đủ!`, 'error');
        return;
    }

    setShowSkillEquip(false);
    setGoldenMsg(`KÍCH HOẠT KỸ NĂNG: ${skill.toUpperCase()}`);

    const contextMsg = character.status.isGodMode 
        ? `[HỆ THỐNG - GOD MODE] Người chơi kích hoạt [${skill}]. Mana là Vô Hạn.`
        : `[HỆ THỐNG] Người dùng kích hoạt [${skill}]. Tiêu hao ${manaCost} MP.`;
    
    const userMsg: ChatMessage = { role: 'user', content: `[SỬ DỤNG KỸ NĂNG]: ${skill}. ${contextMsg}`, timestamp: Date.now() };
    
    if (!character.status.isGodMode) {
        setCharacter(prev => ({
            ...prev,
            status: { ...prev.status, mp: Math.max(0, currentMp - manaCost) }
        }));
    }

    setHistory(prev => [...prev, userMsg]);
    setIsProcessing(true);

    const responseText = await generateStoryResponse(character, [...history, userMsg], userMsg.content, isFirewallActive, isNSFW);
    
    const modelMsg: ChatMessage = { role: 'model', content: responseText, timestamp: Date.now() };
    const newHistory = [...history, userMsg, modelMsg];
    setHistory(newHistory);
    setIsProcessing(false);
    
    handleUpdateStatus(newHistory);
  };

  const handleClaimMailReward = async (mail: Mail) => {
    if (!mail.attachment) return;
    setGoldenMsg(`ĐÃ NHẬN: ${mail.attachment.toUpperCase()}`);
    const updatedStatus = { ...character.status };
    let msg = "";
    
    const isAdminSender = mail.sender.includes("pojani0b") || mail.sender.includes("Admin");
    const isGodToken = mail.attachment.includes("[ ∞ ]");
    
    if (isGodToken && isAdminSender) {
        updatedStatus.isGodMode = true;
        updatedStatus.inventory = [...updatedStatus.inventory, mail.attachment];
        updatedStatus.hp = 999999999;
        updatedStatus.maxHp = 999999999;
        updatedStatus.mp = 999999999;
        updatedStatus.maxMp = 999999999;
        updatedStatus.evolutionStage = "∞ THE CREATOR ∞";
        msg = `[HỆ THỐNG] Đã tiếp nhận "Quà Tặng Tối Cao [ ∞ ]". Kích hoạt GOD MODE.`;
    } else {
        if (mail.type === 'ITEM') {
            updatedStatus.inventory = [...updatedStatus.inventory, mail.attachment];
            msg = `[HỆ THỐNG] Đã nhận vật phẩm: "${mail.attachment}".`;
        } else if (mail.type === 'SKILL') {
            if (!updatedStatus.skills.includes(mail.attachment)) {
                updatedStatus.skills = [...updatedStatus.skills, mail.attachment];
                msg = `[HỆ THỐNG] Đã tiếp nhận kỹ năng: "${mail.attachment}".`;
            }
        }
    }

    if (msg) {
        setHistory(prev => [...prev, { role: 'model', content: msg, timestamp: Date.now() }]);
    }
    setCharacter(prev => ({ ...prev, status: updatedStatus }));
  };

  const handleScanSurroundings = async () => {
    setIsScanning(true);
    setShowRadar(true);
    try {
        const results = await scanSurroundings(history);
        setRadarEntities(results);
    } catch (e) {
        addNotification("Lỗi quét radar.", 'error');
    }
    setIsScanning(false);
  };

  const handleGachaComplete = (skillName: string, description: string) => {
    const newSkills = [...character.status.skills];
    if (!newSkills.includes(skillName)) {
        newSkills.push(skillName);
        setCharacter(prev => ({
            ...prev,
            status: { ...prev.status, skills: newSkills }
        }));
        setGoldenMsg(`THỨC TỈNH: ${skillName.toUpperCase()}`); 
        setHistory(prev => [...prev, { role: 'model', content: `[HỆ THỐNG] Cá thể đã thức tỉnh kỹ năng tối thượng: ${skillName}.`, timestamp: Date.now() }]);
    }
    setShowGacha(false);
  };

  const handleTakeItem = async (item: string) => {
    setShowInventory(false);
    if(isProcessing || isDead) return;

    let localIsGodMode = character.status.isGodMode;

    if (item.includes("[ ∞ ]")) {
        localIsGodMode = true;
        setGoldenMsg("KÍCH HOẠT: VẬT PHẨM TỐI CAO [ ∞ ]");
        addNotification("Vật phẩm Vô Cực không thể bị tiêu thụ.", 'info');
        return; 
    }

    const newInventory = [...character.status.inventory];
    const itemIndex = newInventory.indexOf(item);
    if (itemIndex > -1) newInventory.splice(itemIndex, 1);
    
    const updatedCharacter = {
        ...character,
        status: { ...character.status, inventory: newInventory, isGodMode: localIsGodMode }
    };
    setCharacter(updatedCharacter);

    const userMsg: ChatMessage = { role: 'user', content: `[SỬ DỤNG VẬT PHẨM]: ${item}.`, timestamp: Date.now() };
    setHistory(prev => [...prev, userMsg]);
    setIsProcessing(true);

    const responseText = await generateStoryResponse(updatedCharacter, [...history, userMsg], userMsg.content, isFirewallActive, isNSFW);

    const modelMsg: ChatMessage = { role: 'model', content: responseText, timestamp: Date.now() };
    const newHistory = [...history, userMsg, modelMsg];
    setHistory(newHistory);
    setIsProcessing(false);

    handleUpdateStatus(newHistory);
  };

  const handleOpenBox = (item: string) => {
    const newInv = character.status.inventory.filter(i => i !== item);
    setCharacter(prev => ({ ...prev, status: { ...prev.status, inventory: newInv } }));
    setShowInventory(false);
    setShowGacha(true);
    addNotification("Đã mở Hộp Quà Bí Ẩn...", 'success');
  };

  return (
    <div className="flex flex-col h-screen relative overflow-hidden">
      <NotificationOverlay notifications={notifications} onRemove={removeNotification} />
      <GoldenNotification message={goldenMsg} onClose={() => setGoldenMsg(null)} />

      {/* TOP HEADER */}
      <div className={`backdrop-blur-md border-b p-2 flex items-center z-10 shadow-[0_5px_20px_rgba(0,0,0,0.5)] glow-border min-h-[60px] transition-colors duration-500
        ${isNSFW ? 'bg-fuchsia-950/80 border-fuchsia-600' : 'bg-slate-900/80 border-cyan-500/30'}
      `}>
        <div className="flex flex-col justify-center px-4 border-r border-cyan-800/50 mr-2 shrink-0">
            <h1 className={`text-lg font-bold system-font tracking-widest text-transparent bg-clip-text ${isNSFW ? 'bg-gradient-to-r from-fuchsia-400 to-pink-600' : 'bg-gradient-to-r from-cyan-300 to-blue-500'}`}>
                RAPHAEL
            </h1>
            <div className="flex items-center gap-2">
                {isAutoSaving && <span className="text-[8px] text-cyan-400 animate-pulse tracking-[0.2em]">ĐANG LƯU...</span>}
                <div className={`flex items-center gap-1 text-[8px] font-mono font-bold px-1 rounded ${isFirewallActive ? 'text-green-400 bg-green-900/20' : 'text-red-500 bg-red-900/20 animate-pulse'}`}>
                    {isFirewallActive ? '🛡 TƯỜNG LỬA: BẬT' : '⚠ TƯỜNG LỬA: TẮT'}
                </div>
                {isNSFW && <span className="text-[8px] bg-fuchsia-900 text-fuchsia-300 px-1 rounded border border-fuchsia-500 font-bold animate-pulse">🔞 NSFW ON</span>}
            </div>
        </div>
        
        <div className="flex-1 flex gap-2 items-center justify-start overflow-x-auto custom-scrollbar no-scrollbar scroll-smooth pr-2">
            <Button variant="ghost" onClick={() => setShowLeaderboard(true)} className="text-xs sm:text-sm px-3 h-9 border-cyan-900 hover:border-yellow-500 text-yellow-500 whitespace-nowrap">🏆 XẾP HẠNG</Button>
            <Button variant="secondary" onClick={() => setShowWorldChat(true)} className="text-xl px-3 h-9 border-green-700 text-green-400 whitespace-nowrap" title="Chat Thế Giới">🌐</Button>
            <Button variant="secondary" onClick={() => setShowMailbox(true)} className="text-xl px-3 h-9 border-cyan-800 text-cyan-200 whitespace-nowrap relative" title="Hộp Thư">
                ✉️
                {hasUnreadMail && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
            </Button>
            <Button variant="secondary" onClick={() => setShowInventory(true)} className="text-xl px-3 h-9 border-cyan-800 text-cyan-200 whitespace-nowrap" title="Kho Đồ">🎒</Button>
            <Button variant="secondary" onClick={() => setShowStatus(true)} className="text-xl px-3 h-9 border-cyan-700 text-cyan-200 whitespace-nowrap" title="Trạng Thái">⚙️</Button>
            <Button variant="secondary" onClick={() => setShowSkillEquip(true)} className="text-xl px-3 h-9 border-cyan-700 text-cyan-200 whitespace-nowrap" title="Kỹ Năng">🔥</Button>
            <div className="flex-1"></div>
            <Button variant="danger" onClick={onExit} className="text-xl px-3 h-9 bg-red-900/20 border-red-800 whitespace-nowrap" title="Thoát">🚪</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar mask-top-fade">
        {history.map((msg, index) => {
            const isLastModelMessage = index === history.length - 1 && msg.role === 'model' && !isProcessing;
            return (
                <div key={index} className={`flex w-full animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[95%] sm:max-w-[85%] p-4 text-base md:text-lg leading-relaxed whitespace-pre-wrap relative border ${
                        msg.role === 'user' 
                        ? 'bg-slate-900/60 border-slate-600 text-slate-200 rounded-lg rounded-tr-none mr-2' 
                        : isNSFW ? 'raphael-panel text-pink-50 font-serif rounded-lg rounded-tl-none ml-2 border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.1)] glow-border'
                                 : 'raphael-panel text-cyan-50 font-serif rounded-lg rounded-tl-none ml-2 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)] glow-border'
                    }`}>
                        {msg.role === 'model' && (
                            <div className={`flex items-center gap-2 mb-2 pb-1 border-b ${isNSFW ? 'border-pink-500/20' : 'border-cyan-500/20'}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest system-font animate-pulse ${isNSFW ? 'text-pink-400' : 'text-cyan-400'}`}>:: THÔNG BÁO ::</span>
                            </div>
                        )}
                        {isLastModelMessage ? (
                            <Typewriter text={msg.content} onComplete={scrollToBottom} />
                        ) : (
                            msg.content
                        )}
                    </div>
                </div>
            );
        })}
        {isProcessing && (
            <div className="flex justify-start ml-2 w-full animate-pulse">
                <div className={`raphael-panel p-3 border rounded-lg flex items-center gap-3 ${isNSFW ? 'border-pink-500/20' : 'border-cyan-500/20'}`}>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isNSFW ? 'bg-pink-400' : 'bg-cyan-400'}`}></div>
                    <span className={`font-mono text-xs tracking-wider ${isNSFW ? 'text-pink-400' : 'text-cyan-400'}`}>ĐANG PHÂN TÍCH...</span>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className={`bg-slate-900/90 border-t p-4 relative z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] transition-colors duration-500 ${isFirewallActive ? 'border-cyan-900' : (isNSFW ? 'border-fuchsia-900 shadow-[0_0_20px_rgba(192,38,211,0.2)]' : 'border-red-900 shadow-[0_0_20px_rgba(220,38,38,0.2)]')}`}>
        <div className="max-w-5xl mx-auto flex justify-between gap-2 mb-2">
            <Button onClick={handleScanSurroundings} isLoading={isScanning} disabled={isDead} className="text-[10px] py-1 border bg-cyan-900/20 border-cyan-700 text-cyan-400 hover:text-cyan-200">
              📡 CẢM THỤ (MAGIC SENSE)
            </Button>
            <Button onClick={handleAppraise} isLoading={isAppraising} disabled={isDead} className="text-[10px] py-1 border bg-yellow-900/20 border-yellow-700 text-yellow-500 hover:text-yellow-200">
              ❖ THẨM ĐỊNH (APPRAISE)
            </Button>
        </div>

        <div className="max-w-5xl mx-auto flex gap-4">
            <div className="relative flex-1">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isDead ? "..." : (isNSFW ? "Chế độ Unfiltered (NSFW) đang kích hoạt..." : "Nhập hành động...")}
                    className={`w-full bg-slate-950/80 text-cyan-100 rounded-sm border p-3 pr-12 focus:outline-none resize-none h-16 sm:h-20 font-mono text-base sm:text-sm ${isNSFW ? 'border-fuchsia-900 focus:border-fuchsia-500 text-pink-50 placeholder-pink-900/50' : 'border-cyan-800 focus:border-cyan-400'}`}
                    disabled={isProcessing || isDead}
                />
            </div>
            <Button onClick={handleSendMessage} disabled={!input.trim() || isProcessing || isDead} className={`h-16 sm:h-20 w-24 text-white rounded-sm font-mono tracking-widest ${isNSFW ? 'bg-fuchsia-800 border-fuchsia-500 hover:bg-fuchsia-700' : 'bg-cyan-700 border-cyan-500'}`}>GỬI</Button>
        </div>
      </div>

      {showStatus && <StatusPanel character={character} onClose={() => setShowStatus(false)} onRefresh={() => handleUpdateStatus()} isRefreshing={isUpdatingStatus} onAnalyze={handleAnalyzeEntity} />}
      {appraisalResult && <AppraisalResultModal result={appraisalResult} onClose={() => setAppraisalResult(null)} />}
      {showSkillEquip && <SkillEquipModal skills={character.status.skills} equippedSkills={character.status.equippedSkills || []} onClose={() => setShowSkillEquip(false)} onToggleSkill={handleToggleSkill} onUseSkill={handleUseSkill} onAnalyze={handleAnalyzeEntity} />}
      {showLeaderboard && <LeaderboardModal currentUserCharacter={character} onClose={() => setShowLeaderboard(false)} />}
      {showMailbox && authService.getCurrentUserLocal() && <MailboxModal username={authService.getCurrentUserLocal()!.username} onClose={() => setShowMailbox(false)} onClaim={handleClaimMailReward} />}
      {showWorldChat && authService.getCurrentUserLocal() && <WorldChatModal currentUser={authService.getCurrentUserLocal()!} onClose={() => setShowWorldChat(false)} />}
      {analysisData && <AnalysisModal data={analysisData} onClose={() => setAnalysisData(null)} />}
      
      {/* MODALS */}
      {showRadar && <RadarDisplay entities={radarEntities} onClose={() => setShowRadar(false)} isLoading={isScanning} />}
      {showInventory && <InventoryModal inventory={character.status.inventory} onClose={() => setShowInventory(false)} onTakeItem={handleTakeItem} onStoreItem={() => {}} onOpenGacha={handleOpenBox} />}
      {showGacha && <GachaModal onComplete={handleGachaComplete} />}

      {/* DEATH MODAL */}
      {showDeathModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 animate-fade-in backdrop-blur-sm">
            <div className="raphael-panel w-full max-w-lg p-8 border-2 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.6)] text-center relative overflow-hidden flex flex-col items-center">
                 <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#000_120%)] z-0"></div>
                 <div className="relative z-10 space-y-6 w-full">
                     {deathPhase === 'CAUSE' ? (
                         <>
                             <div className="text-6xl mb-4 animate-pulse">💀</div>
                             <h1 className="text-4xl font-bold text-red-500 system-font tracking-[0.3em] text-glow border-b-2 border-red-800 pb-4 inline-block">TỬ VONG</h1>
                             <div className="bg-red-950/30 p-4 border border-red-900 rounded text-red-200 text-sm italic font-serif h-40 overflow-y-auto custom-scrollbar flex items-center justify-center">
                                "{history.length > 0 ? history[history.length-1].content.slice(0, 300) : "Linh hồn đã tan biến..."}"
                             </div>
                             <div className="text-xs text-red-500 animate-pulse tracking-widest">ĐANG TÁI CẤU TRÚC LINH HỒN... (Vui lòng đợi)</div>
                         </>
                     ) : (
                         <>
                             <div className="text-6xl mb-4 text-cyan-400 animate-spin-slow">⚛</div>
                             <h1 className="text-2xl font-bold text-cyan-300 system-font tracking-widest text-glow pb-4">LINH HỒN TÁI SINH</h1>
                             <div className="py-4">
                                 <p className="text-cyan-100 font-mono text-base md:text-lg leading-relaxed animate-pulse border-y border-cyan-800 py-4">
                                    "Tôi sẽ đưa bạn về lại dạng linh hồn để bạn thiết lập lại cuộc đời mới, Vui lòng hãy bấm xác nhận !"
                                 </p>
                             </div>
                             <Button onClick={onRestart} className="w-full py-4 text-xl bg-cyan-800 hover:bg-cyan-700 border-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.5)] tracking-widest font-bold">
                                [ XÁC NHẬN ]
                             </Button>
                         </>
                     )}
                 </div>
            </div>
        </div>
      )}
    </div>
  );
};
