
export enum GameState {
  SERVER_SELECTION, // Deprecated but kept for type compatibility
  AUTH, 
  MAIN_MENU,
  CHARACTER_CREATION,
  INTRO_SEQUENCE,
  PLAYING,
  ADMIN_PANEL, 
}

export type DifficultyLevel = 'EASY' | 'NORMAL' | 'HARD' | 'INSTANT_DEATH';

export interface ServerConfig {
  id: string;
  name: string;
  region: string;
  status: 'ONLINE' | 'MAINTENANCE' | 'FULL';
  description: string;
}

export const GAME_SERVERS: ServerConfig[] = [
  { id: 'sv_global', name: 'Global Tempest', region: 'World', status: 'ONLINE', description: 'Máy chủ duy nhất. Nơi mọi linh hồn hội tụ.' },
];

export interface UserProfile {
  username: string;
  createdAt: number;
  lastActive?: number; 
  isAdmin?: boolean;
  isBanned?: boolean;
  saveData?: SaveData;
}

export interface Mail {
  id: string;
  sender: string;
  title: string;
  content: string;
  type: 'TEXT' | 'SKILL' | 'ITEM';
  attachment?: string; 
  timestamp: number;
  isRead: boolean;
  isClaimed: boolean;
}

export interface Quest {
  id: string;
  name: string; 
  description: string; 
  current: number; 
  required: number; 
  unit: string; 
  isCompleted: boolean;
}

export interface CharacterAttributes {
  strength: number;
  magic: number;
  agility: number;
  defense: number;
}

export interface CharacterStatus {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  skills: string[]; 
  equippedSkills: string[]; 
  activeEffects: string[]; 
  inventory: string[]; 
  quests: Quest[]; 
  level: number;
  evolutionStage: string;
  difficulty: DifficultyLevel;
  isGodMode?: boolean;
}

export interface Character {
  name: string;
  race: string;
  uniqueSkill: string;
  reincarnationReason: string; 
  location: string; 
  attributes: CharacterAttributes;
  status: CharacterStatus;
  customAvatar?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface SaveData {
  character: Character;
  chatHistory: ChatMessage[];
  lastSaved: number;
}

export interface BattleLogEntry {
  turn: number; 
  actor: string; 
  skill: string; 
  description: string; 
  damage: number; 
  effect?: 'CRIT' | 'LIFESTEAL' | 'STUN' | 'VOID' | 'NORMAL' | 'DOUBLE';
}

export interface BattleMetadata {
  type: 'METADATA';
  p1_energy: number;
  p2_energy: number;
  p1_cooldowns: Record<string, number>;
  p2_cooldowns: Record<string, number>;
}

export interface BattleState {
  id: number;
  server_id: string;
  challenger: string;
  target: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'IN_PROGRESS' | 'FINISHED';
  winner?: string;
  turn: string;
  logs: (BattleLogEntry | BattleMetadata)[]; 
  p1_hp: number;
  p1_max_hp: number;
  p2_hp: number;
  p2_max_hp: number;
  p1_energy?: number;
  p2_energy?: number;
  p1_cooldowns?: Record<string, number>;
  p2_cooldowns?: Record<string, number>;
  last_updated: number;
}
