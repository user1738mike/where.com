import { UserPlus, Shuffle, MessageCircle } from 'lucide-react';

const steps = [
  { icon: UserPlus, step: '01', title: 'Create Your Profile', description: 'Sign up with your estate details, add your interests, and upload a photo. Takes less than 2 minutes.' },
  { icon: Shuffle, step: '02', title: 'Get Matched', description: 'Our algorithm connects you with verified neighbors who share your interests and live nearby.' },
  { icon: MessageCircle, step: '03', title: 'Start Connecting', description: 'Video chat, text, or join group rooms. Build real friendships with people in your community.' },
];

const HowItWorks = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground">Three simple steps to meet your neighbors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-20 left-[20%] right-[20%] h-px bg-gradient-to-r from-where-coral via-where-teal to-where-coral opacity-30" />

          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="glass rounded-2xl p-8 text-center hover:border-white/20 transition-all hover:-translate-y-1 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-where-coral to-where-teal text-white text-sm font-bold px-5 py-1.5 rounded-full shadow-lg">
                  Step {step.step}
                </div>
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-where-coral/15 to-where-teal/15 rounded-2xl flex items-center justify-center mb-6 mt-4 group-hover:scale-110 transition-transform">
                  <step.icon className="w-10 h-10 text-where-coral" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
