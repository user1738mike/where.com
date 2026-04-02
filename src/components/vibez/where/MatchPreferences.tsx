import { forwardRef } from 'react';
import { Label } from '@/components/vibez/ui/label';
import { Checkbox } from '@/components/vibez/ui/checkbox';
import { Slider } from '@/components/vibez/ui/slider';

interface MatchPreferencesProps {
  preferences: {
    videoEnabled: boolean;
    textOnly: boolean;
    gender: string;
    ageRange: [number, number];
    interests: string[];
  };
  onPreferencesChange: (preferences: any) => void;
}

const MatchPreferences = forwardRef<HTMLDivElement, MatchPreferencesProps>(({ preferences, onPreferencesChange }, ref) => {
  const interests = [
    'Sports', 'Business', 'Parents', 'Students',
    'Fitness', 'Tech', 'Food', 'Music',
    'Travel', 'Books', 'Movies', 'Gaming'
  ];

  const toggleInterest = (interest: string) => {
    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter(i => i !== interest)
      : [...preferences.interests, interest];
    onPreferencesChange({ ...preferences, interests: newInterests });
  };

  return (
    <div ref={ref} className="space-y-6">
      {/* Chat Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Chat Type</Label>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="video"
              checked={preferences.videoEnabled}
              onCheckedChange={(checked) =>
                onPreferencesChange({ ...preferences, videoEnabled: checked as boolean })
              }
            />
            <Label htmlFor="video" className="cursor-pointer">Video Chat</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="text"
              checked={preferences.textOnly}
              onCheckedChange={(checked) =>
                onPreferencesChange({ ...preferences, textOnly: checked as boolean })
              }
            />
            <Label htmlFor="text" className="cursor-pointer">Text Only</Label>
          </div>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <Label htmlFor="gender" className="text-base font-semibold">Gender Preference</Label>
        <select
          id="gender"
          value={preferences.gender}
          onChange={(e) => onPreferencesChange({ ...preferences, gender: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-input rounded-md"
        >
          <option value="any">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Age Range */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Age Range: {preferences.ageRange[0]} - {preferences.ageRange[1]}
        </Label>
        <Slider
          value={preferences.ageRange}
          onValueChange={(value) => onPreferencesChange({ ...preferences, ageRange: value as [number, number] })}
          min={18}
          max={65}
          step={1}
          className="w-full"
        />
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Match by Interests</Label>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                preferences.interests.includes(interest)
                  ? 'bg-where-coral text-where-coral-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {interest}
            </button>
          ))}
        </div>
        {preferences.interests.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Selected: {preferences.interests.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
});

MatchPreferences.displayName = 'MatchPreferences';

export default MatchPreferences;
