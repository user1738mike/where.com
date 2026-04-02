import { ShieldCheck, Lock, Eye, MapPinOff } from 'lucide-react';

const badges = [
  { icon: ShieldCheck, title: 'Verified Neighbors', description: 'Estate verification required' },
  { icon: Lock, title: 'End-to-End Privacy', description: 'Your data stays secure' },
  { icon: Eye, title: '24/7 Moderation', description: 'Active community safety' },
  { icon: MapPinOff, title: 'Location Protected', description: 'Exact address never shared' },
];

const TrustBadges = () => {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {badges.map((badge, index) => (
            <div key={index} className="glass rounded-xl px-5 py-3 flex items-center gap-3 group hover:border-where-teal/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-where-teal/10 flex items-center justify-center group-hover:glow-teal transition-all">
                <badge.icon className="w-5 h-5 text-where-teal" />
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">{badge.title}</div>
                <div className="text-xs text-muted-foreground">{badge.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
