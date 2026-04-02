import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import WhereHeader from '../../components/vibez/where/WhereHeader';
import WhereFooter from '../../components/vibez/where/WhereFooter';
import { Video, Shield, Users, MapPin, Heart, Sparkles } from 'lucide-react';
import { Button } from '../../components/vibez/ui/button';
import StatsBar from '../../components/vibez/where/StatsBar';
import TrustBadges from '../../components/vibez/where/TrustBadges';
import HowItWorks from '../../components/vibez/where/HowItWorks';
import AppPreview from '../../components/vibez/where/AppPreview';
import FAQ from '../../components/vibez/where/FAQ';
import Testimonials from '../../components/vibez/where/Testimonials';
import EstatesCovered from '../../components/vibez/where/EstatesCovered';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0, 0, 0.2, 1] as const } },
} as const;

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const features = [
  { icon: MapPin, title: 'Hyperlocal Matching', desc: 'Only connect with verified neighbors in your estate or within 2km radius.', color: 'from-where-coral/20 to-where-coral/5', iconColor: 'text-where-coral', size: 'md:col-span-2' },
  { icon: Video, title: 'Random Video Chats', desc: '10-minute video or text chats with neighbors who share your interests.', color: 'from-where-teal/20 to-where-teal/5', iconColor: 'text-where-teal', size: '' },
  { icon: Shield, title: 'Safety First', desc: 'Location verification, instant report, and three-strike moderation.', color: 'from-where-online/20 to-where-online/5', iconColor: 'text-where-online', size: '' },
  { icon: Users, title: 'Interest-Based Rooms', desc: 'Join group video rooms: Sports, Parents Corner, Business Network.', color: 'from-where-notification/20 to-where-notification/5', iconColor: 'text-where-notification', size: 'md:col-span-2' },
  { icon: Sparkles, title: 'Events Integration', desc: 'See who\'s attending local events. Meet attendees before the event.', color: 'from-where-coral/20 to-where-coral/5', iconColor: 'text-where-coral', size: '' },
  { icon: Heart, title: 'Build Connections', desc: 'Send friend requests after great chats. Real community, real friendships.', color: 'from-where-teal/20 to-where-teal/5', iconColor: 'text-where-teal', size: '' },
];

const useCases = [
  { emoji: '🏢', title: 'New Residents', desc: 'Just moved in? Meet your neighbors instantly.' },
  { emoji: '👨‍👩‍👧', title: 'Parents', desc: 'Find other parents. Arrange playdates and share tips.' },
  { emoji: '💼', title: 'Remote Workers', desc: 'Connect with professionals working from home.' },
  { emoji: '🎉', title: 'Event Organizers', desc: 'Promote estate events and meet attendees.' },
];

const Where = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <WhereHeader />

      {/* Hero Section */}
      <section className="pt-24 pb-20 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-[10%] w-[400px] h-[400px] bg-where-coral/15 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-10 right-[10%] w-[500px] h-[500px] bg-where-teal/15 rounded-full blur-[120px] animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] animate-glow-pulse" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div className="max-w-4xl mx-auto" variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp} className="inline-block mb-6 px-5 py-2 glass rounded-full">
              <span className="text-sm font-semibold text-foreground">✨ Now in Beta — Free Forever</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground">Meet Your Neighbors</span><br />
              <span className="gradient-text">Before You Meet Them</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Random video chats with verified neighbors in your estate.
              Build real community connections, discover local events.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/vibez/where/register">
                <Button size="lg" className="bg-gradient-to-r from-where-coral to-where-teal text-white text-lg px-10 py-6 rounded-full font-bold shadow-xl hover:shadow-where-coral/25 hover:scale-105 transition-all glow-coral">
                  Get Started — It's Free
                </Button>
              </Link>
            </motion.div>

            <motion.p variants={fadeUp} className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link to="/vibez/where/login" className="text-where-coral font-semibold hover:underline transition-colors">
                Log in here
              </Link>
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <StatsBar />
      </motion.div>

      {/* Trust Badges */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <TrustBadges />
      </motion.div>

      {/* How It Works */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <HowItWorks />
      </motion.div>

      {/* App Preview */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <AppPreview />
      </motion.div>

      {/* Features - Bento Grid */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="py-20">
        <div className="container mx-auto px-4">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need to build your neighborhood community</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className={`glass rounded-2xl p-7 group hover:border-white/20 transition-all duration-300 hover:-translate-y-1 ${f.size}`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-7 h-7 ${f.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <Testimonials />
      </motion.div>

      {/* Use Cases */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="py-20">
        <div className="container mx-auto px-4">
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-center mb-12 text-foreground">Perfect For</motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {useCases.map((uc, i) => (
              <motion.div key={i} variants={fadeUp} className="glass rounded-xl p-6 group hover:border-white/20 hover:-translate-y-1 transition-all">
                <div className="text-4xl mb-3">{uc.emoji}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{uc.title}</h3>
                <p className="text-muted-foreground">{uc.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Estates */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <EstatesCovered />
      </motion.div>

      {/* FAQ */}
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-50px' }} variants={fadeUp}>
        <FAQ />
      </motion.div>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-where-coral/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-where-teal/20 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Your Neighbors Are <span className="gradient-text">Waiting</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-muted-foreground mb-8">
              Join Where Connect today. Free forever for residents.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link to="/vibez/where/register">
                <Button size="lg" className="bg-gradient-to-r from-where-coral to-where-teal text-white text-xl px-12 py-7 rounded-full font-bold shadow-xl hover:shadow-where-coral/25 hover:scale-105 transition-all glow-coral">
                  Create Your Profile
                </Button>
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-6 text-sm">
              Currently available in Nairobi estates • More cities coming soon
            </motion.p>
            <motion.p variants={fadeUp} className="text-muted-foreground mt-3 text-sm">
              Already a member?{' '}
              <Link to="/vibez/where/login" className="text-where-coral font-semibold hover:underline">Log in</Link>
            </motion.p>
          </motion.div>
        </div>
      </section>

      <WhereFooter />
    </div>
  );
};

export default Where;
