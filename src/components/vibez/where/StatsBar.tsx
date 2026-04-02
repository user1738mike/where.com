import React, { useEffect, useState } from 'react';
import { Users, Building2, Gift, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StatItemProps {
  icon: React.ReactNode;
  value: number;
  suffix?: string;
  label: string;
  live?: boolean;
}

const StatItem = ({ icon, value, suffix = '', label, live }: StatItemProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="glass rounded-2xl p-5 flex flex-col items-center text-center group hover:border-white/20 transition-all">
      <div className="mb-3 text-where-coral group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2">
        {count}{suffix}
        {live && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-where-online opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-where-online" />
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

const StatsBar = () => {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('landing-presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ visitor_id: crypto.randomUUID(), online_at: new Date().toISOString() });
        }
      });
    return () => { channel.unsubscribe(); };
  }, []);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem icon={<Radio className="w-7 h-7" />} value={onlineCount} label="Online Now" live />
          <StatItem icon={<Users className="w-7 h-7" />} value={50} suffix="+" label="Neighbors Connected" />
          <StatItem icon={<Building2 className="w-7 h-7" />} value={5} suffix="+" label="Estates in Nairobi" />
          <StatItem icon={<Gift className="w-7 h-7" />} value={100} suffix="%" label="Free Forever" />
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
