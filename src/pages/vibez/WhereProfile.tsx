import { useState, useEffect } from 'react';
import WhereHeader from '../../components/vibez/where/WhereHeader';
import { Camera, Sparkles, Heart, Zap, Music, Gamepad2, Coffee, Dumbbell, Book, Palette, Code, Film, Save, X, MapPin, Loader2 } from 'lucide-react';
import { Button } from '../../components/vibez/ui/button';
import { Input } from '../../components/vibez/ui/input';
import { Label } from '../../components/vibez/ui/label';
import { Textarea } from '../../components/vibez/ui/textarea';
import { Switch } from '../../components/vibez/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';
import { detectLocation } from '@/lib/locationService';

const INTEREST_OPTIONS = [
  { id: 'music', label: 'Music', icon: Music, emoji: '🎵' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, emoji: '🎮' },
  { id: 'coffee', label: 'Coffee Lover', icon: Coffee, emoji: '☕' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, emoji: '💪' },
  { id: 'reading', label: 'Reading', icon: Book, emoji: '📚' },
  { id: 'art', label: 'Art & Design', icon: Palette, emoji: '🎨' },
  { id: 'tech', label: 'Tech', icon: Code, emoji: '💻' },
  { id: 'movies', label: 'Movies', icon: Film, emoji: '🎬' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'cooking', label: 'Cooking', emoji: '🍳' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'pets', label: 'Pet Parent', emoji: '🐕' },
];

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  estate: string;
  neighborhood: string | null;
  unit_number: string | null;
  bio: string | null;
  age: number | null;
  gender: string | null;
  interests: string[];
  video_enabled: boolean;
  text_only: boolean;
  profile_photo_url: string | null;
}

const WhereProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const geolocation = useGeolocation();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    age: '',
    gender: '',
    interests: [] as string[],
    video_enabled: true,
    text_only: false,
    profilePhoto: null as File | null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('where_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoading(false);
        return;
      }

      setProfile({ ...data, name: data.full_name || data.name || '' });
      setFormData({
        name: data.full_name || data.name || '',
        phone: data.phone || '',
        bio: data.bio || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        interests: data.interests || [],
        video_enabled: data.video_enabled ?? true,
        text_only: data.text_only ?? false,
        profilePhoto: null,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter(i => i !== interestId)
        : [...prev.interests, interestId]
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    if (!formData.name.trim()) {
      toast.error('Name is required bestie! 💅');
      return;
    }

    setSaving(true);

    try {
      // Upload profile photo if provided
      let profilePhotoUrl = profile.profile_photo_url;
      if (formData.profilePhoto) {
        const fileExt = formData.profilePhoto.name.split('.').pop();
        const fileName = `${profile.user_id}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('where-photos')
          .upload(filePath, formData.profilePhoto, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast.error('Photo upload failed, but profile was saved.');
        } else {
          const { data } = supabase.storage
            .from('where-photos')
            .getPublicUrl(filePath);
          profilePhotoUrl = data.publicUrl;
          console.log('Photo uploaded successfully. URL:', profilePhotoUrl);
        }
      }

      const { error } = await supabase
        .from('where_profiles')
        .update({
          full_name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          bio: formData.bio.trim() || null,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          interests: formData.interests,
          profile_photo_url: profilePhotoUrl,
          video_enabled: formData.video_enabled,
          text_only: formData.text_only,
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated! You ate that! 🔥');
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Oops! Something went wrong 😭');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        age: profile.age?.toString() || '',
        gender: profile.gender || '',
        interests: profile.interests || [],
        video_enabled: profile.video_enabled ?? true,
        text_only: profile.text_only ?? false,
        profilePhoto: null,
      });
    }
    setEditMode(false);
  };

  const handlePhotoChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, profilePhoto: file }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-where-coral to-where-teal rounded-full animate-bounce mx-auto mb-4"></div>
          <p className="text-muted-foreground animate-pulse">Loading your vibe... ✨</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WhereHeader />
      
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Profile Header */}
          <div className="relative mb-8">
            {/* Gradient Banner */}
            <div className="h-32 bg-gradient-to-r from-where-coral via-purple-500 to-where-teal rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiIGN4PSIyMCIgY3k9IjIwIiByPSIzIi8+PC9nPjwvc3ZnPg==')] opacity-50"></div>
              <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/50 animate-pulse" />
              <Heart className="absolute bottom-4 left-4 w-5 h-5 text-white/50 animate-bounce" />
              <Zap className="absolute top-6 left-1/3 w-4 h-4 text-yellow-300/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            {/* Avatar */}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-where-coral to-where-teal p-1">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-4xl font-bold text-where-coral overflow-hidden">
                    {formData.profilePhoto ? (
                      <img src={URL.createObjectURL(formData.profilePhoto)} alt="Profile Preview" className="w-full h-full object-cover" />
                    ) : profile?.profile_photo_url ? (
                      <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profile?.name?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                </div>
                <button
                  onClick={() => document.getElementById('photo-upload')?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-where-teal text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                  disabled={!editMode}
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handlePhotoChange(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Name and Estate */}
          <div className="text-center mt-16 mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {profile?.name} <span className="inline-block animate-bounce">✨</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              📍 {profile?.estate}
              {profile?.neighborhood && ` • ${profile.neighborhood}`}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="px-3 py-1 bg-where-online/20 text-where-online rounded-full text-sm font-medium animate-pulse">
                🟢 Online
              </span>
            </div>
          </div>

          {/* Edit Toggle */}
          <div className="flex justify-center mb-8">
            {!editMode ? (
              <Button 
                onClick={() => setEditMode(true)}
                className="bg-gradient-to-r from-where-coral to-where-teal text-white rounded-full px-8 hover:opacity-90 hover:scale-105 transition-all"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Glow Up My Profile
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-where-online text-white rounded-full px-6 hover:bg-where-online/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="rounded-full px-6"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <div className="space-y-6">
            {/* Basic Info Card */}
            <div className="glass rounded-2xl p-6 hover:border-where-coral/20 transition-all">
              <h2 className="text-xl font-bold text-card-foreground mb-6 flex items-center gap-2">
                <span className="text-2xl">👤</span> The Basics
              </h2>
              
              <div className="grid gap-5">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-muted-foreground mb-2 block">
                    What do they call you? 💫
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!editMode}
                    className="bg-muted/50 border-border/50 rounded-xl"
                    placeholder="Your name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age" className="text-sm font-medium text-muted-foreground mb-2 block">
                      Age 🎂
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      disabled={!editMode}
                      className="bg-muted/50 border-border/50 rounded-xl"
                      placeholder="Your age"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender" className="text-sm font-medium text-muted-foreground mb-2 block">
                      Gender 🌈
                    </Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={!editMode}
                      className="w-full h-10 px-3 bg-muted/50 border border-border/50 rounded-xl text-foreground disabled:opacity-50"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground mb-2 block">
                    Phone (optional) 📱
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!editMode}
                    className="bg-muted/50 border-border/50 rounded-xl"
                    placeholder="+254..."
                  />
                </div>

                <div>
                  <Label htmlFor="bio" className="text-sm font-medium text-muted-foreground mb-2 block">
                    Your Vibe Check 💭
                  </Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editMode}
                    className="bg-muted/50 border-border/50 rounded-xl min-h-[100px] resize-none"
                    placeholder="Tell your neighbors about yourself... what's your energy? 🌟"
                  />
                </div>
              </div>
            </div>

            {/* Interests Card */}
            <div className="glass rounded-2xl p-6 hover:border-where-coral/20 transition-all">
              <h2 className="text-xl font-bold text-card-foreground mb-2 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Your Interests
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Pick what you're into! More matches = more fun 🎉
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = formData.interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      onClick={() => editMode && handleInterestToggle(interest.id)}
                      disabled={!editMode}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-where-coral bg-where-coral/10 scale-105'
                          : 'border-border hover:border-where-coral/50 hover:bg-muted/50'
                      } ${!editMode && 'cursor-default'}`}
                    >
                      <span className="text-2xl mb-1 block">{interest.emoji}</span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-where-coral' : 'text-muted-foreground'}`}>
                        {interest.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Preferences Card */}
            <div className="glass rounded-2xl p-6 hover:border-where-coral/20 transition-all">
              <h2 className="text-xl font-bold text-card-foreground mb-6 flex items-center gap-2">
                <span className="text-2xl">💬</span> Chat Vibes
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">Video Calls Enabled 📹</p>
                    <p className="text-sm text-muted-foreground">Show your face to neighbors</p>
                  </div>
                  <Switch
                    checked={formData.video_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, video_enabled: checked })}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                  <div>
                    <p className="font-medium text-foreground">Text-Only Mode 💬</p>
                    <p className="text-sm text-muted-foreground">Prefer typing over talking</p>
                  </div>
                  <Switch
                    checked={formData.text_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, text_only: checked })}
                    disabled={!editMode}
                  />
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="glass rounded-2xl p-6 hover:border-where-teal/20 transition-all">
              <h2 className="text-xl font-bold text-card-foreground mb-6 flex items-center gap-2">
                <span className="text-2xl">📍</span> Your Hood
              </h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Estate</p>
                  <p className="font-medium text-foreground">{profile?.estate}</p>
                </div>
                {profile?.neighborhood && (
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm text-muted-foreground mb-1">Neighborhood</p>
                    <p className="font-medium text-foreground">{profile.neighborhood}</p>
                  </div>
                )}
                
                {/* Update Location Button */}
                <Button
                  variant="outline"
                  className={`w-full transition-all ${
                    locationDetecting 
                      ? 'bg-where-teal/10 border-where-teal' 
                      : 'hover:bg-where-teal/10 hover:border-where-teal'
                  }`}
                  disabled={locationDetecting}
                  onClick={async () => {
                    setLocationDetecting(true);
                    try {
                      toast.info('🛰️ Vibing with satellites...', { duration: 2000 });
                      
                      // Try up to 3 readings, keep the best accuracy
                      let bestPos: GeolocationPosition | null = null;
                      for (let attempt = 0; attempt < 3; attempt++) {
                        const pos = await geolocation.getCurrentPosition();
                        if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
                          bestPos = pos;
                        }
                        if (bestPos.coords.accuracy <= 100) break;
                        if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
                      }

                      const accuracy = Math.round(bestPos!.coords.accuracy);
                      if (accuracy > 500) {
                        toast.warning(`GPS accuracy is ~${accuracy}m. You may want to edit manually.`);
                      }

                      const location = await detectLocation(bestPos!.coords.latitude, bestPos!.coords.longitude);
                      
                      // Update profile with new location
                      const { error } = await supabase
                        .from('where_profiles')
                        .update({
                          estate: location.estate,
                          neighborhood: location.neighborhood,
                        })
                        .eq('id', profile?.id);
                      
                      if (error) throw error;
                      
                      toast.success(`📍 Location updated to ${location.estate}! 🎯`);
                      fetchProfile(); // Refresh profile data
                    } catch (error: any) {
                      toast.error(error.message || 'Could not update location 😢');
                    } finally {
                      setLocationDetecting(false);
                    }
                  }}
                >
                  {locationDetecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finding your new spot... 🔍
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Update My Location 🎯
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Moved? Update your hood to connect with new neighbors! 🏘️
                </p>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-r from-where-coral/10 to-where-teal/10 border border-where-coral/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">📊</span> Your Stats (Coming Soon!)
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-card/50 rounded-xl">
                  <p className="text-3xl font-bold text-where-coral">0</p>
                  <p className="text-sm text-muted-foreground">Chats</p>
                </div>
                <div className="p-4 bg-card/50 rounded-xl">
                  <p className="text-3xl font-bold text-where-teal">0</p>
                  <p className="text-sm text-muted-foreground">Friends</p>
                </div>
                <div className="p-4 bg-card/50 rounded-xl">
                  <p className="text-3xl font-bold text-where-online">0</p>
                  <p className="text-sm text-muted-foreground">Events</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhereProfile;
