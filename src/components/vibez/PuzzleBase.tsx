import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/vibez/ui/card';
import { Button } from '@/components/vibez/ui/button';
import { Input } from '@/components/vibez/ui/input';
import { Label } from '@/components/vibez/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/vibez/ui/radio-group';
import { useGamification } from '@/contexts/GamificationContext';
import { useToast } from '@/hooks/use-toast';

interface PuzzleOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface PuzzleBaseProps {
  eventType: string;
  title: string;
  emoji: string;
  question: string;
  options: PuzzleOption[];
  bonusField: {
    label: string;
    type: 'text' | 'select';
    options?: string[];
  };
  waitlistMessage: string;
  onComplete: (success: boolean, playerAlias?: string) => void;
}

const PuzzleBase: React.FC<PuzzleBaseProps> = ({
  eventType,
  title,
  emoji,
  question,
  options,
  bonusField,
  waitlistMessage,
  onComplete,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [bonusAnswer, setBonusAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { addCompletion, generatePlayerAlias, getRandomBadge, checkEarlyBird } = useGamification();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedAnswer) {
      toast({
        title: "Please select an answer",
        description: "Choose one of the options before submitting.",
        variant: "destructive",
      });
      return;
    }

    const correctOption = options.find(opt => opt.isCorrect);
    const isCorrect = selectedAnswer === correctOption?.id;
    
    setIsSubmitted(true);
    setShowResult(true);

    if (isCorrect) {
      const playerAlias = generatePlayerAlias();
      const badge = getRandomBadge();
      const startTime = new Date(Date.now() - Math.random() * 60 * 60 * 1000); // Random start time for demo
      const isEarlyBird = checkEarlyBird(startTime);

      const completion = {
        eventType,
        playerAlias,
        badge,
        completedAt: new Date(),
        isEarlyBird,
        bonusAnswer: bonusAnswer || undefined,
      };

      addCompletion(completion);
      onComplete(true, playerAlias);

      toast({
        title: `🎉 Puzzle Complete!`,
        description: `Welcome ${playerAlias}! You've earned the ${badge} badge.`,
      });
    } else {
      onComplete(false);
      toast({
        title: "Not quite right!",
        description: "Give it another try or check back later for more puzzles.",
        variant: "destructive",
      });
    }
  };

  const resetPuzzle = () => {
    setSelectedAnswer('');
    setBonusAnswer('');
    setIsSubmitted(false);
    setShowResult(false);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">{emoji}</div>
        <CardTitle className="text-2xl font-bold text-purple-600">{title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!showResult ? (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">{question}</h3>
              
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonus">{bonusField.label}</Label>
              {bonusField.type === 'text' ? (
                <Input
                  id="bonus"
                  value={bonusAnswer}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBonusAnswer(e.target.value)}
                  placeholder="Your answer..."
                />
              ) : (
                <RadioGroup value={bonusAnswer} onValueChange={setBonusAnswer}>
                  {bonusField.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              disabled={isSubmitted}
            >
              {isSubmitted ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-4">
            {selectedAnswer === options.find(opt => opt.isCorrect)?.id ? (
              <div className="space-y-4">
                <div className="text-6xl">🎉</div>
                <h3 className="text-xl font-bold text-green-600">Correct!</h3>
                <p className="text-gray-700">{waitlistMessage}</p>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    🎟️ You now have priority access to this event type!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl">😅</div>
                <h3 className="text-xl font-bold text-red-600">Not quite!</h3>
                <p className="text-gray-700">Don't worry, you can try again or explore other puzzles.</p>
              </div>
            )}
            
            <Button 
              onClick={resetPuzzle}
              variant="outline"
              className="mt-4"
            >
              Try Another Puzzle
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PuzzleBase;
