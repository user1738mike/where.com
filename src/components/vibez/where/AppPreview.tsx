import { Video, MessageCircle, Users, MapPin, Heart, Bell } from 'lucide-react';

const AppPreview = () => {
  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-4xl font-bold text-foreground mb-6">See What Awaits You</h2>
            <p className="text-lg text-muted-foreground mb-8">A beautiful, intuitive interface designed to help you connect effortlessly.</p>

            <div className="space-y-4">
              {[
                { icon: Video, color: 'text-where-coral', bg: 'from-where-coral/20 to-where-coral/5', title: 'HD Video Calls', desc: 'Crystal clear face-to-face conversations' },
                { icon: Users, color: 'text-where-teal', bg: 'from-where-teal/20 to-where-teal/5', title: 'Neighbor Grid', desc: 'See who\'s online in your estate' },
                { icon: MessageCircle, color: 'text-where-online', bg: 'from-where-online/20 to-where-online/5', title: 'Instant Chat', desc: 'Text when video isn\'t convenient' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative animate-float">
              <div className="w-[280px] md:w-[320px] h-[580px] md:h-[640px] glass-strong rounded-[3rem] border-2 border-white/10 shadow-2xl shadow-black/40 overflow-hidden relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-background/80 rounded-b-2xl z-10" />
                <div className="h-full bg-background p-4 pt-10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-lg font-bold gradient-text">Where</div>
                      <div className="text-xs text-muted-foreground">Kilimani Estate</div>
                    </div>
                    <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
                      <Bell className="w-4 h-4 text-where-coral" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { name: 'Sarah M.', status: 'Online', online: true },
                      { name: 'James K.', status: 'Away', online: false },
                      { name: 'Grace W.', status: 'Online', online: true },
                      { name: 'Peter N.', status: 'Online', online: true },
                    ].map((n, i) => (
                      <div key={i} className="glass rounded-xl p-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-where-coral/30 to-where-teal/30 mb-2" />
                        <div className="text-center">
                          <div className="text-sm font-medium text-foreground">{n.name}</div>
                          <div className="flex items-center justify-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${n.online ? 'bg-where-online' : 'bg-yellow-500'}`} />
                            <span className="text-xs text-muted-foreground">{n.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-where-coral to-where-teal rounded-xl p-4 text-white text-center">
                    <Video className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold">Start Random Chat</div>
                    <div className="text-xs text-white/80">3 neighbors available</div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 glass rounded-2xl p-3 flex justify-around">
                    <MapPin className="w-5 h-5 text-where-coral" />
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <Video className="w-5 h-5 text-muted-foreground" />
                    <Heart className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="absolute -top-8 -right-8 w-32 h-32 bg-where-coral/20 rounded-full blur-[60px]" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-where-teal/20 rounded-full blur-[60px]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppPreview;
