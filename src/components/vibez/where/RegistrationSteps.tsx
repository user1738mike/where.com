
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/vibez/ui/button';
import { Input } from '@/components/vibez/ui/input';
import { Label } from '@/components/vibez/ui/label';
import { Textarea } from '@/components/vibez/ui/textarea';
import { Checkbox } from '@/components/vibez/ui/checkbox';
import { Progress } from '@/components/vibez/ui/progress';
import { Upload, MapPin, Eye, EyeOff, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { detectLocation } from '@/lib/locationService';

// Custom geolocation hook
const useGeolocation = () => {
  const getCurrentPosition = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy // meters
          });
        },
        (error) => {
          reject(new Error(error.message || 'Failed to get location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // always get a fresh reading
        }
      );
    });
  };

  return { getCurrentPosition };
};




const RegistrationSteps = ({ onComplete }: { onComplete: () => void }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [lowAccuracy, setLowAccuracy] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const geolocation = useGeolocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    estate: '',
    neighborhood: '',
    unitNumber: '',
    age: '',
    gender: '',
    bio: '',
    interests: [] as string[],
    profilePhoto: null as File | null,
    videoEnabled: true,
    textOnly: false,
    termsAccepted: false,
  });

  const interests = [
    'Sports', 'Business', 'Parents', 'Students', 
    'Fitness', 'Tech', 'Food', 'Music', 
    'Travel', 'Books', 'Movies', 'Gaming'
  ];

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/vibez/where/register`,
        },
      });
      if (error) {
        toast({ title: 'Google Sign Up Failed', description: error.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not connect to Google. Please try again.', variant: 'destructive' });
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast({ title: "Error", description: "Please enter your name", variant: "destructive" });
          return false;
        }
        if (!isGoogleUser) {
          if (!formData.email.trim() || !formData.email.includes('@')) {
            toast({ title: "Error", description: "Please enter a valid email", variant: "destructive" });
            return false;
          }
          if (!formData.password || formData.password.length < 6) {
            toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
            return false;
          }
        }
        if (!formData.age || parseInt(formData.age) < 18) {
          toast({ title: "Error", description: "You must be 18+ to use Where", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.estate.trim()) {
          toast({ title: "Error", description: "Please enter your estate/apartment name", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        if (formData.interests.length < 3) {
          toast({ title: "Error", description: "Please select at least 3 interests", variant: "destructive" });
          return false;
        }
        return true;
      case 4:
        if (!formData.termsAccepted) {
          toast({ title: "Error", description: "Please accept the terms and conditions", variant: "destructive" });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleRegistration();
    }
  };

  const handleRegistration = async () => {
    setLoading(true);

    try {
      let userId: string;

      if (isGoogleUser) {
        // Google user is already authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({ title: "Error", description: "Google session expired. Please sign in again.", variant: "destructive" });
          return;
        }
        userId = user.id;
      } else {
        // Email/password signup
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/vibez/where/dashboard`
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            toast({ title: "Email Already Registered", description: "This email is already registered. Please log in instead.", variant: "destructive" });
          } else {
            toast({ title: "Authentication Error", description: authError.message, variant: "destructive" });
          }
          return;
        }

        if (!authData.user) {
          toast({ title: "Registration Failed", description: "Registration failed. Please try again.", variant: "destructive" });
          return;
        }
        userId = authData.user.id;
      }

      // 2. Upload profile photo if provided
      let profilePhotoUrl: string | undefined;
      if (formData.profilePhoto) {
        const fileExt = formData.profilePhoto.name.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('where-photos')
          .upload(filePath, formData.profilePhoto, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Photo upload error:', uploadError);
          toast({
            title: "Photo Upload Failed",
            description: "Profile photo upload failed, but account created successfully.",
            variant: "destructive" as any
          });
        } else {
          const { data } = supabase.storage
            .from('where-photos')
            .getPublicUrl(filePath);
          profilePhotoUrl = data.publicUrl;
        }
      }

      // 3. Create the profile
      const nameTrim = formData.name?.trim();
      const nameValue = nameTrim && nameTrim.length > 0 ? nameTrim : 'User';

      const { error: profileError } = await supabase
        .from('where_profiles')
        .insert({
          user_id: userId,
          full_name: nameValue,
          email: formData.email.trim() || '',
          phone: formData.phone.trim() || null,
          estate: formData.estate.trim(),
          neighborhood: formData.neighborhood.trim() || null,
          unit_number: formData.unitNumber.trim() || null,
          age: parseInt(formData.age) || null,
          gender: formData.gender || null,
          bio: formData.bio.trim() || null,
          interests: formData.interests,
          profile_photo_url: profilePhotoUrl,
          video_enabled: formData.videoEnabled,
          text_only: formData.textOnly,
          profile_completed: true
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast({
          title: "Profile Creation Failed",
          description: "Failed to create profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Welcome to Where! 🎉",
        description: "Your account has been created successfully. Redirecting to dashboard...",
      });

      // Give the user time to see the success message before redirecting
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Error",
        description: "An error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        // Check if profile already completed (returning user)
        const { data: existingProfile } = await supabase
          .from('where_profiles')
          .select('profile_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingProfile?.profile_completed) {
          // Returning user — skip registration entirely
          onComplete();
          return;
        }

        const isOAuth = user.app_metadata?.provider === 'google';
        setIsGoogleUser(isOAuth);
        setFormData(prev => ({
          ...prev,
          email: user.email || prev.email,
          name: (user.user_metadata?.full_name as string) || prev.name,
          phone: (user.user_metadata?.phone as string) || prev.phone,
        }));
        if (isOAuth) {
          // Google user redirected back — skip to step 2 (location)
          setCurrentStep(2);
        }
      }
    };
    getUser();
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-card-foreground">Basic Information</h2>
          
          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium hover:bg-accent"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign up with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">or sign up with email</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+254 700 000 000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="18"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="18"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Must be 18+ for video chat</p>
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-background border border-input rounded-md"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Location */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-card-foreground">Location Verification</h2>
          
          <div className="bg-where-teal/10 border border-where-teal/20 rounded-lg p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-where-teal flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-card-foreground">Why location?</p>
              <p className="text-muted-foreground">We only connect you with verified neighbors in your area for safety and community building.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="estate">Estate/Apartment Name *</Label>
              <Input
                id="estate"
                value={formData.estate}
                onChange={(e) => setFormData({ ...formData, estate: e.target.value })}
                placeholder="e.g., Tsavo Apartments"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="neighborhood">Neighborhood/Area</Label>
              <Input
                id="neighborhood"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                placeholder="e.g., Roysambu"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="unitNumber">Unit Number (Optional)</Label>
              <Input
                id="unitNumber"
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                placeholder="e.g., A12"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">This won't be shown to others</p>
            </div>

            {/* Location Detection Button */}
            <Button 
              variant="outline" 
              className={`w-full transition-all ${
                locationDetected 
                  ? 'bg-where-online/10 border-where-online text-where-online' 
                  : 'hover:bg-where-teal/10 hover:border-where-teal'
              }`}
              onClick={async () => {
                setLocationDetecting(true);
                setLocationDetected(false);
                setLowAccuracy(false);
                setLocationAccuracy(null);
                try {
                  // Try up to 3 readings, keep the best (lowest accuracy value)
                  let bestCoords: { latitude: number; longitude: number; accuracy?: number } | null = null;
                  for (let attempt = 0; attempt < 3; attempt++) {
                    const coords = await geolocation.getCurrentPosition();
                    if (!bestCoords || (coords.accuracy != null && (bestCoords.accuracy == null || coords.accuracy < bestCoords.accuracy))) {
                      bestCoords = coords;
                    }
                    // Stop early if accuracy is good enough
                    if (bestCoords.accuracy != null && bestCoords.accuracy <= 100) break;
                    // Small delay between retries
                    if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
                  }

                  if (bestCoords!.accuracy != null) {
                    setLocationAccuracy(Math.round(bestCoords!.accuracy));
                    if (bestCoords!.accuracy > 150) setLowAccuracy(true);
                    if (bestCoords!.accuracy > 500) {
                      toast({ title: "Low GPS Accuracy", description: "GPS accuracy is low. You can manually edit your estate name below.", variant: "destructive" });
                    }
                  }

                  console.log('🛰️ Best GPS accuracy:', bestCoords!.accuracy, 'm');
                  const location = await detectLocation(bestCoords!.latitude, bestCoords!.longitude);

                  setFormData(prev => ({
                    ...prev,
                    estate: location.estate,
                    neighborhood: location.neighborhood || '',
                  }));

                  setLocationDetected(true);
                  console.log(`📍 Found you at ${location.estate}! ${location.confidence === 'high' ? '🎯' : '📌'}`);
                } catch (error: any) {
                  console.error(error.message || 'Could not detect location 😢');
                } finally {
                  setLocationDetecting(false);
                }
              }}
              disabled={locationDetecting}
            >
              {locationDetecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding your hood... 📍
                </>
              ) : locationDetected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Location Found! ✨
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Use Current Location 🎯
                </>
              )}
            </Button>
            
            {locationDetected && (
              <div className="p-3 bg-where-online/10 border border-where-online/30 rounded-lg text-center">
                <p className="text-sm text-where-online font-medium">
                  📍 We found you in {formData.estate}!
                </p>
                {locationAccuracy !== null && (
                  <p className="text-xs text-muted-foreground mt-1">Approx. accuracy: ~{locationAccuracy} m</p>
                )}
                {lowAccuracy ? (
                  <div className="mt-2 text-xs text-amber-600">
                    Location accuracy is low — results may be imprecise. Try again or edit manually.
                    <div className="mt-2 flex gap-2 justify-center">
                      <Button variant="ghost" onClick={async () => {
                        // retry detection
                        setLocationDetecting(true);
                        setLocationDetected(false);
                        setLowAccuracy(false);
                        setLocationAccuracy(null);
                        try {
                          const coords = await geolocation.getCurrentPosition();
                          if (typeof coords.accuracy === 'number') {
                            setLocationAccuracy(Math.round(coords.accuracy));
                            if (coords.accuracy > 100) setLowAccuracy(true);
                          }
                          const location = await detectLocation(coords.latitude, coords.longitude);
                          setFormData(prev => ({ ...prev, estate: location.estate, neighborhood: location.neighborhood || '' }));
                          setLocationDetected(true);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setLocationDetecting(false);
                        }
                      }}>Retry</Button>
                      <Button variant="outline" onClick={() => setLowAccuracy(false)}>Accept Anyway</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">You can edit above if this isn't quite right</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Profile Setup */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-card-foreground">Create Your Profile</h2>
          
          <div className="space-y-4">
            <div>
              <Label>Profile Photo</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-border">
                  {formData.profilePhoto ? (
                    <img 
                      src={URL.createObjectURL(formData.profilePhoto)} 
                      alt="Profile" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <Button variant="outline" onClick={() => document.getElementById('photo-upload')?.click()}>
                  Upload Photo
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFormData({ ...formData, profilePhoto: e.target.files[0] });
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio (Max 150 characters)</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 150) })}
                placeholder="Tell your neighbors a bit about yourself..."
                className="mt-1 resize-none"
                rows={3}
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.bio.length}/150 characters
              </p>
            </div>

            <div>
              <Label>Interests (Select at least 3) *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      formData.interests.includes(interest)
                        ? 'bg-where-coral text-where-coral-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {formData.interests.length}/3 minimum
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Preferences */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-card-foreground">Chat Preferences</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="videoEnabled"
                checked={formData.videoEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, videoEnabled: checked as boolean })}
              />
              <div className="flex-1">
                <Label htmlFor="videoEnabled" className="cursor-pointer">
                  Enable Video Chat
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow video calls with neighbors (recommended for better connections)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="textOnly"
                checked={formData.textOnly}
                onCheckedChange={(checked) => setFormData({ ...formData, textOnly: checked as boolean })}
              />
              <div className="flex-1">
                <Label htmlFor="textOnly" className="cursor-pointer">
                  Text Only Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Prefer text chat only (no video/audio)
                </p>
              </div>
            </div>

            <div className="bg-where-coral/10 border border-where-coral/20 rounded-lg p-4">
              <h3 className="font-semibold text-card-foreground mb-2">Community Guidelines</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Be respectful and kind to all neighbors</li>
                <li>✓ Keep conversations appropriate</li>
                <li>✓ Report any inappropriate behavior</li>
                <li>✓ Maintain your neighbor's privacy</li>
              </ul>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox 
                id="terms" 
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: checked as boolean })}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                I agree to the Terms of Service and Privacy Policy *
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1"
          disabled={loading}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="flex-1 bg-where-coral text-where-coral-foreground hover:bg-where-coral/90"
          disabled={loading}
        >
          {loading ? 'Creating account...' : currentStep === totalSteps ? 'Complete Registration' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default RegistrationSteps;
