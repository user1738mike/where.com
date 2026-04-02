import { useState, useEffect, forwardRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Home, MessageSquare, User, Bell, LogOut, ArrowLeft, Shield, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/vibez/ui/button';
import { toast } from 'sonner';

interface WhereHeaderProps {
  showBackArrow?: boolean;
}

const WhereHeader = forwardRef<HTMLElement, WhereHeaderProps>(({ showBackArrow = true }, ref) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setIsLoggedIn(!!session);
      if (session) {
        fetchUserName(session.user.id);
        checkAdminStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setIsLoggedIn(!!session);
      if (session) {
        fetchUserName(session.user.id);
        checkAdminStatus(session.user.id);
      } else {
        setUserName(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase.rpc('has_role' as any, { _user_id: userId, _role: 'admin' });
    setIsAdmin(data === true);
  };

  const fetchUserName = async (userId: string) => {
    const { data } = await supabase
      .from('where_profiles')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();
    if (data && data.name) {
      setUserName(data.name.split(' ')[0]);
    } else {
      setUserName(null);
    }
  };

  const handleSignOut = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('where_profiles').update({ is_online: false }).eq('user_id', user.id);
    }
    const { error } = await supabase.auth.signOut();
    if (!error) {
      toast.success('Signed out successfully');
      navigate('/vibez/where');
    }
  };

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 font-medium text-sm transition-colors ${
      isActive(path) ? 'text-where-coral' : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <header
      ref={ref}
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-strong shadow-lg shadow-black/20' : 'bg-background/40 backdrop-blur-md border-b border-white/5'
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackArrow && (
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <Link to="/vibez/where" className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">🏘️ Where</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-5">
            {isLoggedIn ? (
              <>
                <Link to="/vibez/where/dashboard" className={navLinkClass('/vibez/where/dashboard')}>
                  <Home className="w-4 h-4" /> Dashboard
                </Link>
                <Link to="/vibez/where/chat" className={navLinkClass('/vibez/where/chat')}>
                  <MessageSquare className="w-4 h-4" /> Chat
                </Link>
                <Link to="/vibez/where/rooms" className={navLinkClass('/vibez/where/rooms')}>
                  <Users className="w-4 h-4" /> Rooms
                </Link>
                <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-where-notification rounded-full" />
                </button>
                <Link to="/vibez/where/profile" className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <User className="w-5 h-5" />
                </Link>
                {isAdmin && (
                  <Link to="/vibez/where/admin" className={navLinkClass('/vibez/where/admin')}>
                    <Shield className="w-4 h-4" /> Admin
                  </Link>
                )}
                <button onClick={handleSignOut} className="p-2 text-destructive hover:text-destructive/80 transition-colors" title="Sign out">
                  <LogOut className="w-5 h-5" />
                </button>
                {userName && (
                  <span className="text-sm text-muted-foreground px-3 py-1 glass rounded-full">Hi, {userName}</span>
                )}
              </>
            ) : (
              <>
                <Link to="/vibez/where/login">
                  <Button variant="ghost" className="text-foreground">Log In</Button>
                </Link>
                <Link to="/vibez/where/register">
                  <Button className="bg-gradient-to-r from-where-coral to-where-teal text-white hover:opacity-90 rounded-full px-6">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </nav>

          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-4 pb-4 border-t border-white/10 overflow-hidden"
            >
              <div className="pt-4 space-y-1">
                {isLoggedIn ? (
                  <>
                    {[
                      { to: '/vibez/where/dashboard', label: '🏠 Dashboard' },
                      { to: '/vibez/where/chat', label: '💬 Chat' },
                      { to: '/vibez/where/rooms', label: '👥 Group Rooms' },
                      { to: '/vibez/where/profile', label: '👤 Profile' },
                    ].map(item => (
                      <Link key={item.to} to={item.to} className="block px-4 py-2.5 text-foreground hover:bg-white/5 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                        {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link to="/vibez/where/admin" className="block px-4 py-2.5 text-foreground hover:bg-white/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>🛡️ Admin</Link>
                    )}
                    <button onClick={() => { handleSignOut(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-destructive hover:bg-white/5 rounded-lg">
                      🚪 Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/vibez/where/login" className="block px-4 py-2.5 text-foreground hover:bg-white/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                    <Link to="/vibez/where/register" className="block px-4 py-2.5 bg-gradient-to-r from-where-coral to-where-teal text-white rounded-lg text-center" onClick={() => setIsMenuOpen(false)}>Get Started</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
});

WhereHeader.displayName = 'WhereHeader';

export default WhereHeader;
