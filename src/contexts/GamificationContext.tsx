import { createContext, useContext, useState, ReactNode } from 'react';

interface Completion {
  eventType: string;
  playerAlias: string;
  badge: string;
  completedAt: Date;
  isEarlyBird: boolean;
  bonusAnswer?: string;
}

interface GamificationContextType {
  completedPuzzles: Completion[];
  addCompletion: (completion: Completion) => void;
  generatePlayerAlias: () => string;
  getRandomBadge: () => string;
  checkEarlyBird: (startTime: Date) => boolean;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const adjectives = ['Swift', 'Brave', 'Clever', 'Mystic', 'Cosmic', 'Noble', 'Shadow', 'Thunder', 'Crystal', 'Phoenix'];
const nouns = ['Wolf', 'Dragon', 'Hawk', 'Tiger', 'Panther', 'Falcon', 'Viper', 'Lion', 'Eagle', 'Bear'];
const badges = ['🌟', '⭐', '🏆', '🎖️', '💎', '🔥', '✨', '🎯', '🌙', '🎮'];

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
  const [completedPuzzles, setCompletedPuzzles] = useState<Completion[]>([]);

  const addCompletion = (completion: Completion) => {
    setCompletedPuzzles(prev => [...prev, completion]);
  };

  const generatePlayerAlias = (): string => {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    return `${adjective}${noun}${number}`;
  };

  const getRandomBadge = (): string => {
    return badges[Math.floor(Math.random() * badges.length)];
  };

  const checkEarlyBird = (startTime: Date): boolean => {
    const now = new Date();
    const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    return diffMinutes <= 30;
  };

  return (
    <GamificationContext.Provider value={{
      completedPuzzles,
      addCompletion,
      generatePlayerAlias,
      getRandomBadge,
      checkEarlyBird,
    }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = (): GamificationContextType => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
