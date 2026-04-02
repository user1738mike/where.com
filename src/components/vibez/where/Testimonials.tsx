import React from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  { name: 'Sarah Mwangi', estate: 'Kilimani Estate', avatar: 'SM', quote: 'I moved to Kilimani 3 months ago and felt so isolated. Where helped me meet amazing neighbors who are now close friends!', rating: 5 },
  { name: 'James Kamau', estate: 'Westlands', avatar: 'JK', quote: 'As a remote worker, I was missing social interaction. Now I have coffee with neighbors I met on Where every week.', rating: 5 },
  { name: 'Grace Wanjiku', estate: 'Lavington', avatar: 'GW', quote: 'Found other moms in my building through the Parents Corner room. Our kids have playdates every weekend now!', rating: 5 },
];

const Testimonials = React.forwardRef<HTMLElement, Record<string, never>>((_, ref) => {
  return (
    <section ref={ref} className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-foreground mb-4">What Neighbors Say</h2>
          <p className="text-lg text-muted-foreground">Real stories from our community</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="glass rounded-2xl p-8 relative group hover:border-white/20 transition-all hover:-translate-y-1">
              <Quote className="absolute top-6 right-6 w-8 h-8 text-where-coral/10 group-hover:text-where-coral/20 transition-colors" />

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-where-coral to-where-teal flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-where-coral/20">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-bold text-foreground">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.estate}</div>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed italic">"{t.quote}"</p>

              <div className="flex gap-1">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-where-notification text-where-notification" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

Testimonials.displayName = 'Testimonials';

export default Testimonials;
