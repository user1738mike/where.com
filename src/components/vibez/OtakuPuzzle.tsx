import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/vibez/ui/card';
import { Button } from '@/components/vibez/ui/button';
import { Input } from '@/components/vibez/ui/input';
import { Label } from '@/components/vibez/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/vibez/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useGamification } from '@/contexts/GamificationContext';

const OtakuPuzzle = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const { addCompletion, generatePlayerAlias, checkEarlyBird } = useGamification();

  const questions = [
    {
      step: 1,
      title: "The Portal Opens",
      question: "Which anime features a 'Death Note' that can kill anyone whose name is written in it?",
      options: [
        { id: 'a', text: 'Bleach', isCorrect: false },
        { id: 'b', text: 'Death Note', isCorrect: true },
        { id: 'c', text: 'Code Geass', isCorrect: false },
        { id: 'd', text: 'Psycho-Pass', isCorrect: false },
      ],
      key: 'step1'
    },
    {
      step: 2,
      title: "The Connection Deepens",
      question: "In Studio Ghibli films, what is the name of the forest spirit in 'Princess Mononoke'?",
      options: [
        { id: 'a', text: 'Totoro', isCorrect: false },
        { id: 'b', text: 'Kodama', isCorrect: false },
        { id: 'c', text: 'Forest God (Shishigami)', isCorrect: true },
        { id: 'd', text: 'Calcifer', isCorrect: false },
      ],
      key: 'step2'
    },
    {
      step: 3,
      title: "The Final Revelation",
      question: "Complete this iconic line from 'Your Name' (Kimi no Na wa): 'Zenshin zenshin...'",
      options: [
        { id: 'a', text: '...dare da?', isCorrect: true },
        { id: 'b', text: '...nani ga?', isCorrect: false },
        { id: 'c', text: '...doko ni?', isCorrect: false },
        { id: 'd', text: '...itsu made?', isCorrect: false },
      ],
      key: 'step3'
    }
  ];

  const bonusQuestions = [
    {
      step: 1,
      label: "What's your go-to anime genre when you need to escape reality?",
      key: 'bonus1',
      type: 'text' as const
    },
    {
      step: 2,
      label: "Which Studio Ghibli film speaks to your soul the most?",
      key: 'bonus2',
      type: 'text' as const
    },
    {
      step: 3,
      label: "What kind of connection are you hoping to find at this event?",
      key: 'bonus3',
      type: 'select' as const,
      options: ['Deep anime discussions', 'Romantic connection', 'Creative collaboration', 'Lifelong friendship']
    }
  ];

  const currentQuestion = questions[currentStep - 1];
  const currentBonus = bonusQuestions[currentStep - 1];

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.key]: value }));
  };

  const handleBonusAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentBonus.key]: value }));
  };

  const handleNext = () => {
    if (!answers[currentQuestion.key]) {
      toast({
        title: "Please select an answer",
        description: "Choose one of the options before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // Check if all answers are correct
    const allCorrect = questions.every(q => {
      const selectedAnswer = answers[q.key];
      const correctOption = q.options.find(opt => opt.isCorrect);
      return selectedAnswer === correctOption?.id;
    });

    if (allCorrect) {
      const playerAlias = generatePlayerAlias();
      const badge = '🌙'; // Special moon badge for Otaku After Hours
      const startTime = new Date(Date.now() - Math.random() * 30 * 60 * 1000); // Random start time for demo
      const isEarlyBird = checkEarlyBird(startTime);

      const completion = {
        eventType: 'Otaku After Hours',
        playerAlias,
        badge,
        completedAt: new Date(),
        isEarlyBird,
        bonusAnswer: `${answers.bonus1 || ''} | ${answers.bonus2 || ''} | ${answers.bonus3 || ''}`,
      };

      addCompletion(completion);
      setIsCompleted(true);

      toast({
        title: "🌙 The Summoning is Complete!",
        description: `Welcome to the shadows, ${playerAlias}. Your invitation has been activated.`,
      });
    } else {
      toast({
        title: "The ritual is incomplete...",
        description: "Some answers weren't quite right. The shadows require perfect knowledge.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setAnswers({});
    setIsCompleted(false);
  };

  if (isCompleted) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-purple-900 to-indigo-900 text-white border-0">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🌙✨</div>
          <CardTitle className="text-3xl font-bold">The Summoning is Complete!</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="bg-purple-800/50 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-4">🎟️ Your Access is Granted</h3>
            <p className="text-purple-200 mb-4">
              You have proven yourself worthy. The secrets of Otaku After Hours await you.
            </p>
            <div className="bg-purple-700/50 p-4 rounded">
              <p className="text-sm font-mono">
                EVENT CODE: SHADOW-REALM-2025<br/>
                LOCATION: Will be revealed 24h before event<br/>
                STATUS: VIP Access Confirmed ✨
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-bold">What happens next?</h4>
            <ul className="text-left space-y-2 text-purple-200">
              <li>📧 Confirmation email within 24 hours</li>
              <li>📍 Location revealed 24 hours before event</li>
              <li>🎭 Cosplay guidelines and recommendations</li>
              <li>🤝 Connection to other attendees (optional)</li>
            </ul>
          </div>

          <Button 
            onClick={handleReset}
            variant="outline"
            className="mt-6 bg-transparent border-white text-white hover:bg-white hover:text-purple-900"
          >
            Begin Another Summoning
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🌙</div>
        <CardTitle className="text-2xl font-bold text-purple-600">
          {currentQuestion.title}
        </CardTitle>
        <p className="text-sm text-gray-600">Step {currentStep} of 3</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          ></div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">{currentQuestion.question}</h3>
          
          <RadioGroup 
            value={answers[currentQuestion.key] || ''} 
            onValueChange={handleAnswer}
          >
            {currentQuestion.options.map((option) => (
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
          <Label htmlFor="bonus">{currentBonus.label}</Label>
          {currentBonus.type === 'text' ? (
            <Input
              id="bonus"
              value={answers[currentBonus.key] || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleBonusAnswer(e.target.value)}
              placeholder="Your answer..."
            />
          ) : (
            <RadioGroup 
              value={answers[currentBonus.key] || ''} 
              onValueChange={handleBonusAnswer}
            >
              {currentBonus.options?.map((option) => (
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
          onClick={handleNext}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          {currentStep < 3 ? 'Continue The Ritual' : 'Complete The Summoning'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OtakuPuzzle;
