import { useState, useEffect, forwardRef } from 'react';
import { User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Neighbor {
  id: string;
  name: string;
  age: number | null;
  interests: string[];
  is_online: boolean;
}

interface NeighborGridProps {
  estate?: string;
}

const NeighborGrid = forwardRef<HTMLDivElement, NeighborGridProps>(({ estate }, ref) => {
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (estate) {
      fetchNeighbors();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('neighbor-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'where_profiles',
            filter: `estate=eq.${estate}`
          },
          () => {
            fetchNeighbors();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [estate]);

  const fetchNeighbors = async () => {
    if (!estate) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('where_profiles')
        .select('id, name, age, interests, is_online')
        .eq('estate', estate)
        .neq('user_id', user?.id || '')
        .order('is_online', { ascending: false })
        .limit(8);

      if (error) throw error;
      setNeighbors(data || []);
    } catch (error) {
      console.error('Error fetching neighbors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted rounded-xl p-4 animate-pulse">
            <div className="w-12 h-12 bg-muted-foreground/20 rounded-full mx-auto mb-3"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-muted-foreground/20 rounded w-1/2 mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (neighbors.length === 0) {
    return (
      <div ref={ref} className="text-center py-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No other neighbors found in your estate yet.</p>
        <p className="text-sm mt-1">Be the first to invite your neighbors!</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {neighbors.map((neighbor) => (
        <div 
          key={neighbor.id}
          className="bg-muted/50 rounded-xl p-4 text-center hover:bg-muted transition-colors cursor-pointer"
        >
          <div className="relative inline-block mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-where-coral to-where-teal rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            {neighbor.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-where-online border-2 border-background rounded-full"></span>
            )}
          </div>
          <h4 className="font-semibold text-card-foreground text-sm">
            {neighbor.name?.split(' ')[0] || 'Neighbor'}
          </h4>
          {neighbor.age && (
            <p className="text-xs text-muted-foreground">{neighbor.age} years</p>
          )}
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {neighbor.interests.slice(0, 2).map((interest, idx) => (
                <span 
                  key={idx}
                  className="text-xs bg-where-coral/10 text-where-coral px-2 py-0.5 rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

NeighborGrid.displayName = 'NeighborGrid';

export default NeighborGrid;
