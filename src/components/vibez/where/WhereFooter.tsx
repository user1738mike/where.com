import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

const WhereFooter = forwardRef<HTMLElement, Record<string, never>>((_, ref) => {
  return (
    <footer ref={ref} className="glass-strong border-t border-white/10 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold gradient-text mb-4">Where Connect</h3>
            <p className="text-muted-foreground mb-4">Meet your neighbors. Build your community.</p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">WhatsApp: 0791173864</p>
              <p className="text-sm text-muted-foreground">vibezconnect@gmail.com</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <div className="space-y-2">
              <Link to="/vibez/where" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Home</Link>
              <Link to="/vibez/where/register" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Get Started</Link>
              <Link to="/vibez/where/login" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Log In</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <div className="space-y-2">
              <Link to="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">About</Link>
              <Link to="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Contact</Link>
              <Link to="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Careers</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Follow Us</h4>
            <div className="space-y-2">
              <a href="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Instagram</a>
              <a href="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">TikTok</a>
              <a href="#" className="block text-muted-foreground hover:text-where-coral transition-colors text-sm">Twitter / X</a>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-where-coral/30 to-transparent mt-8 mb-6" />

        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Where Connect. All Rights Reserved.
          </p>
          <div className="mt-2 space-x-4">
            <Link to="#" className="text-muted-foreground hover:text-where-coral text-sm transition-colors">Terms</Link>
            <Link to="#" className="text-muted-foreground hover:text-where-coral text-sm transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
});

WhereFooter.displayName = 'WhereFooter';

export default WhereFooter;
