import React from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';

const estates = [
  { name: 'Kilimani', neighbors: 45, status: 'active' },
  { name: 'Westlands', neighbors: 38, status: 'active' },
  { name: 'Lavington', neighbors: 32, status: 'active' },
  { name: 'Kileleshwa', neighbors: 28, status: 'active' },
  { name: 'Parklands', neighbors: 22, status: 'active' },
  { name: 'Karen', neighbors: 0, status: 'coming' },
  { name: 'Runda', neighbors: 0, status: 'coming' },
  { name: 'Gigiri', neighbors: 0, status: 'coming' },
];

const EstatesCovered = React.forwardRef<HTMLElement, Record<string, never>>((_, ref) => {
  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-foreground mb-4">Estates We Cover</h2>
          <p className="text-lg text-muted-foreground">Growing across Nairobi neighborhoods</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {estates.map((estate, index) => (
            <div
              key={index}
              className={`glass rounded-xl p-4 transition-all group hover:-translate-y-1 ${
                estate.status === 'active' ? 'hover:border-where-teal/40' : 'opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {estate.status === 'active' ? (
                  <CheckCircle2 className="w-4 h-4 text-where-online" />
                ) : (
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">{estate.name}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {estate.status === 'active' ? `${estate.neighbors} neighbors` : 'Coming soon'}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Don't see your estate? <span className="text-where-coral font-semibold cursor-pointer hover:underline">Request it here</span>
          </p>
        </div>
      </div>
    </section>
  );
});

EstatesCovered.displayName = 'EstatesCovered';

export default EstatesCovered;
