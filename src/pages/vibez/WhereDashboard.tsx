import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WhereHeader from '../../components/vibez/where/WhereHeader';
import { Button } from '../../components/vibez/ui/button';
import MatchPreferences from '../../components/vibez/where/MatchPreferences';
import NeighborGrid from '../../components/vibez/where/NeighborGrid';
import { supabase } from '@/integrations/supabase/client';


interface Profile {
  id: string;
  name: string;
  estate: string;
  interests: string[];
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WhereDashboard = () => {
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [neighborsOnline, setNeighborsOnline] = useState(0);
  const [preferences, setPreferences] = useState({
    videoEnabled: true,
    textOnly: false,
    gender: 'any',
    ageRange: [18, 65] as [number, number],
    interests: [] as string[],
  });

  useEffect(() => {
    fetchProfileData();
    
    // Set up presence tracking
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setNeighborsOnline(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        }
      });

    updateOnlineStatus(true);

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error } = await supabase
        .from('where_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !profileData) {
        console.error('Profile fetch error:', error);
        setLoading(false);
        return;
      }

      const formattedProfile: Profile = {
        id: profileData.id,
        name: (profileData as any).name || (profileData as any).full_name || 'User',
        estate: (profileData as any).estate || 'Unknown',
        interests: (profileData as any).interests || []
      };
      setProfile(formattedProfile);
      setNeighborsOnline(3);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOnlineStatus = async (isOnline: boolean) => {
    const { data: { user } }: any = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('where_profiles')
        .update({ is_online: isOnline })
        .eq('user_id', user.id);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-where-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WhereHeader />
      
      <div className="pt-20">
        {/* Top Bar */}
        <div className="glass-strong border-b border-white/5">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}! 👋
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-where-online opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-where-online" />
                  </span>
                  {neighborsOnline} neighbors online in {profile?.estate || 'your estate'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Meet a Neighbor CTA */}
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative rounded-2xl p-8 text-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-where-coral to-where-teal opacity-90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <h2 className="text-3xl font-bold text-white mb-4">🎥 Ready to Meet a Neighbor?</h2>
                  <p className="text-white/90 mb-6 text-lg">Random video chat with someone nearby who shares your interests</p>
                  <Link to="/vibez/where/chat">
                    <Button size="lg" className="bg-white text-where-coral hover:bg-white/90 text-xl px-12 py-7 rounded-full font-bold shadow-xl hover:scale-105 transition-transform">
                      Meet a Neighbor Now
                    </Button>
                  </Link>
                </div>
              </motion.div>

              {/* Group Rooms CTA */}
              <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-foreground">👥 Group Rooms</h3>
                  <Link to="/vibez/where/rooms">
                    <Button variant="outline" size="sm" className="rounded-full">Browse All</Button>
                  </Link>
                </div>
                <p className="text-muted-foreground mb-4">
                  Join topic-based video rooms with multiple neighbors at once
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['🏋️ Fitness', '🍳 Cooking', '💻 Tech', '🎮 Gaming'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 glass rounded-full text-sm text-foreground">{tag}</span>
                  ))}
                </div>
                <Link to="/vibez/where/rooms">
                  <Button className="w-full bg-gradient-to-r from-where-coral to-where-teal text-white hover:opacity-90 rounded-xl">
                    Explore Group Rooms
                  </Button>
                </Link>
              </motion.div>

              {/* Match Preferences */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">⚙️ Match Preferences</h3>
                <MatchPreferences 
                  preferences={preferences}
                  onPreferencesChange={setPreferences}
                />
              </div>

              {/* Who's Around */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">📍 Who's Around</h3>
                <NeighborGrid estate={profile?.estate} />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-sm font-medium text-where-online flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-where-online rounded-full" /> Online
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estate</span>
                    <span className="text-sm font-medium text-foreground">{profile?.estate || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Interests</span>
                    <span className="text-sm font-medium text-foreground">{profile?.interests?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Community */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-bold text-foreground mb-3">🎉 Community</h3>
                <p className="text-muted-foreground text-sm">
                  Events and community features are coming soon! Stay tuned for estate meetups, fitness groups, and more.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhereDashboard;
