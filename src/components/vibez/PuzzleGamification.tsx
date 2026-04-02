import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/vibez/ui/card';
import { Button } from '@/components/vibez/ui/button';
import { Badge } from '@/components/vibez/ui/badge';
import PuzzleBase from './PuzzleBase';
import OtakuPuzzle from './OtakuPuzzle';
import { useGamification } from '@/contexts/GamificationContext';

const PuzzleGamification = () => {
  const [selectedPuzzle, setSelectedPuzzle] = useState<string | null>(null);
  const { completedPuzzles } = useGamification();

  const puzzles = [
    {
      id: 'otaku-after-hours',
      eventType: 'Otaku After Hours',
      title: 'The Summoning Ritual',
      emoji: '🌙',
      description: 'Complete the 3-step summoning ritual to gain access to the exclusive midnight event',
      isSpecial: true,
      waitlistMessage: 'Access granted to the shadow realm! Event details will be revealed to the worthy.',
    },
    {
      id: 'movie-nights',
      eventType: 'Movie Nights',
      title: 'Cinema Cues',
      emoji: '🍿',
      question: 'Which anime title means "Your Name" in English?',
      options: [
        { id: 'a', text: 'Watashi no Namae', isCorrect: false },
        { id: 'b', text: 'Kimi no Na wa', isCorrect: true },
        { id: 'c', text: 'Bokura no Sekai', isCorrect: false },
        { id: 'd', text: 'Anata wa Doko', isCorrect: false },
      ],
      bonusField: {
        label: 'Drop your favorite anime or film that made you cry.',
        type: 'text' as const,
      },
      waitlistMessage: 'Puzzle finishers get priority RSVP to their selected Movie Night theme, and a confirmation code named after a film character.',
    },
    {
      id: 'music-chill',
      eventType: 'Music & Chill',
      title: 'Name That Beat!',
      emoji: '🎶',
      question: 'Finish the lyric: "I wanna dance with somebody..."',
      options: [
        { id: 'a', text: '...who\'s better than my ex', isCorrect: false },
        { id: 'b', text: '...who loves slow jams', isCorrect: false },
        { id: 'c', text: '...who loves me', isCorrect: true },
        { id: 'd', text: '...who buys soda', isCorrect: false },
      ],
      bonusField: {
        label: 'What\'s your go-to karaoke song?',
        type: 'text' as const,
      },
      waitlistMessage: 'Correct answers trigger a "Golden Mic" digital badge + link to pick a Karaoke or Soda & Pop Night date.',
    },
    {
      id: 'corporate-events',
      eventType: 'Corporate Events',
      title: 'Team Sync',
      emoji: '📸',
      question: 'At a retreat, you\'re assigned to plan an activity. Your team wants fun, but your boss wants structure. What do you suggest?',
      options: [
        { id: 'a', text: 'A wine tasting', isCorrect: false },
        { id: 'b', text: 'A water balloon strategy challenge', isCorrect: true },
        { id: 'c', text: 'A PowerPoint party', isCorrect: false },
        { id: 'd', text: 'Karaoke but with evaluations', isCorrect: false },
      ],
      bonusField: {
        label: 'Would you like us to contact you for planning your next event?',
        type: 'select' as const,
        options: ['Yes', 'No'],
      },
      waitlistMessage: 'Companies that pass the test get instant access to a Corporate Vibe Proposal Form and a sample event deck.',
    },
    {
      id: 'outdoor-adventures',
      eventType: 'Outdoor Adventures',
      title: 'Trail Quest',
      emoji: '🏕️',
      question: 'Which of these places is known for a waterfall hike near Nairobi?',
      options: [
        { id: 'a', text: 'Karura', isCorrect: false },
        { id: 'b', text: 'Gikambura', isCorrect: false },
        { id: 'c', text: 'Kilimambogo', isCorrect: true },
        { id: 'd', text: 'Buru Buru', isCorrect: false },
      ],
      bonusField: {
        label: 'What kind of escape do you crave most?',
        type: 'select' as const,
        options: ['Waterfall', 'Campfire', 'Roadtrip', 'Pool Day'],
      },
      waitlistMessage: 'Completion unlocks access to Adventure Club Waitlist with early invites to camping and waterfall dates.',
    },
  ];

  const handlePuzzleComplete = (success: boolean, playerAlias?: string) => {
    if (success && playerAlias) {
      console.log(`Puzzle completed successfully! Player: ${playerAlias}`);
    }
  };

  const getCompletedPuzzle = (puzzleId: string) => {
    return completedPuzzles.find(cp => cp.eventType === puzzles.find(p => p.id === puzzleId)?.eventType);
  };

  if (selectedPuzzle) {
    const puzzle = puzzles.find(p => p.id === selectedPuzzle);
    if (!puzzle) return null;

    return (
      <div className="space-y-6">
        <Button 
          onClick={() => setSelectedPuzzle(null)}
          variant="outline"
          className="mb-4"
        >
          ← Back to Puzzles
        </Button>
        
        {puzzle.isSpecial ? (
          <OtakuPuzzle />
        ) : (
          <PuzzleBase
            eventType={puzzle.eventType}
            title={puzzle.title}
            emoji={puzzle.emoji}
            question={puzzle.question!}
            options={puzzle.options!}
            bonusField={puzzle.bonusField!}
            waitlistMessage={puzzle.waitlistMessage}
            onComplete={handlePuzzleComplete}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">🎮 Vibe Puzzles</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Complete puzzles to unlock priority access to events and earn exclusive badges! 
          Each puzzle tests your knowledge and gets you closer to your next amazing experience.
        </p>
      </div>

      {/* Player Stats */}
      {completedPuzzles.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-center">🏆 Your Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-4">
              {completedPuzzles.map((completion, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl mb-1">{completion.badge}</div>
                  <Badge variant="secondary" className="text-xs">
                    {completion.playerAlias}
                  </Badge>
                  <p className="text-xs text-gray-600 mt-1">{completion.eventType}</p>
                  {completion.isEarlyBird && (
                    <Badge variant="default" className="text-xs mt-1 bg-yellow-500">
                      🎫 Early Bird
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Puzzle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {puzzles.map((puzzle) => {
          const completed = getCompletedPuzzle(puzzle.id);
          return (
            <Card 
              key={puzzle.id} 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                completed ? 'bg-green-50 border-green-200' : 
                puzzle.isSpecial ? 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:shadow-xl' :
                'hover:shadow-xl'
              }`}
              onClick={() => !completed && setSelectedPuzzle(puzzle.id)}
            >
              <CardHeader className="text-center">
                <div className="text-4xl mb-2">{puzzle.emoji}</div>
                <CardTitle className={`text-xl font-bold ${
                  puzzle.isSpecial ? 'text-purple-600' : 'text-purple-600'
                }`}>
                  {puzzle.title}
                </CardTitle>
                <p className="text-sm text-gray-600">{puzzle.eventType}</p>
                {puzzle.isSpecial && (
                  <Badge className="bg-purple-600 text-white text-xs">
                    ✨ Special Event
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent className="text-center">
                {completed ? (
                  <div className="space-y-2">
                    <div className="text-2xl">✅</div>
                    <p className="text-green-600 font-medium">Completed!</p>
                    <Badge variant="outline" className="text-xs">
                      {completed.playerAlias}
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700 text-sm">
                      {puzzle.description || 'Test your knowledge and unlock priority access!'}
                    </p>
                    <Button 
                      className={`w-full ${
                        puzzle.isSpecial 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                      }`}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setSelectedPuzzle(puzzle.id);
                      }}
                    >
                      {puzzle.isSpecial ? 'Begin Ritual' : 'Start Puzzle'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gamification Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <h3 className="text-lg font-bold text-center mb-4">🔐 Gamification Rewards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-2">🎟️</div>
              <p className="text-sm font-medium">Symbol Badge</p>
              <p className="text-xs text-gray-600">Unique badge for each completion</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🎫</div>
              <p className="text-sm font-medium">Early Bird Access</p>
              <p className="text-xs text-gray-600">Complete within 30 minutes</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🧩</div>
              <p className="text-sm font-medium">Friend Invite Bonus</p>
              <p className="text-xs text-gray-600">Refer friends for extra perks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PuzzleGamification;
