import { useState, useCallback } from 'react';

interface KarmaState {
  score: number;
  level: string;
  badge: string;
}

const KARMA_LEVELS = [
  { min: 0, level: 'Newcomer', badge: '🌱' },
  { min: 10, level: 'Friendly', badge: '😊' },
  { min: 25, level: 'Good Neighbor', badge: '🏠' },
  { min: 50, level: 'Community Star', badge: '⭐' },
  { min: 100, level: 'Estate Legend', badge: '👑' },
];

function getLevel(score: number) {
  for (let i = KARMA_LEVELS.length - 1; i >= 0; i--) {
    if (score >= KARMA_LEVELS[i].min) return KARMA_LEVELS[i];
  }
  return KARMA_LEVELS[0];
}

export function useKarma(userId: string | null) {
  const [karma, setKarma] = useState<KarmaState>(() => {
    if (!userId) return { score: 0, level: 'Newcomer', badge: '🌱' };
    const stored = localStorage.getItem(`karma_${userId}`);
    if (stored) {
      const score = parseInt(stored, 10);
      const lvl = getLevel(score);
      return { score, level: lvl.level, badge: lvl.badge };
    }
    return { score: 0, level: 'Newcomer', badge: '🌱' };
  });

  const addKarma = useCallback((points: number) => {
    setKarma((prev) => {
      const newScore = Math.max(0, prev.score + points);
      const lvl = getLevel(newScore);
      if (userId) localStorage.setItem(`karma_${userId}`, String(newScore));
      return { score: newScore, level: lvl.level, badge: lvl.badge };
    });
  }, [userId]);

  // Karma actions
  const onChatCompleted = useCallback(() => addKarma(2), [addKarma]); // Finished a full chat
  const onPositiveReaction = useCallback(() => addKarma(1), [addKarma]); // Sent/received thumbs up
  const onReported = useCallback(() => addKarma(-10), [addKarma]); // Got reported
  const onSkippedEarly = useCallback(() => addKarma(-1), [addKarma]); // Skipped within 30s

  return { karma, addKarma, onChatCompleted, onPositiveReaction, onReported, onSkippedEarly, KARMA_LEVELS };
}
