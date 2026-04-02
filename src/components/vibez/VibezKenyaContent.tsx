import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import EventCard from './EventCard';

const VibezKenyaContent = () => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [experience, setExperience] = useState('');

  const services = [
    {
      emoji: "💘",
      title: "Talk & Connect",
      description: "Speed Dating Nights where Nairobi's boldest singles come to mingle, vibe, and connect in real life.",
      link: "/vibez/talk-connect",
      gradient: "from-pink-500 to-rose-600"
    },
    {
      emoji: "🍿",
      title: "Movie Nights & Movie on the Bus",
      description: "Cinematic experiences from cozy screenings to unique movie bus adventures around the city.",
      link: "/vibez/movie-experiences",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      emoji: "🎤",
      title: "Karaoke & Music Sessions",
      description: "Sing your heart out at our themed karaoke nights and music sessions with great vibes.",
      link: "/vibez/music-chill",
      gradient: "from-green-500 to-teal-600"
    },
    {
      emoji: "📸",
      title: "Corporate Event Solutions",
      description: "Where corporate meets creativity. 360° photo booths, team building, and branded experiences.",
      link: "/vibez/corporate-events",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      emoji: "🏕️",
      title: "Adventure & Outdoor Escapes",
      description: "Weekend camping, road trips, waterfall hikes, and swimming parties for the adventurous soul.",
      link: "/vibez/outdoor",
      gradient: "from-orange-500 to-red-600"
    }
  ];

  const upcomingEvents = [
    {
      title: "Classic Speed Dating Sunday",
      date: "January 12, 2025",
      time: "11:00 AM",
      location: "Rooftop Lounge, Westlands",
      description: "Full-day connection experience with icebreakers, flirty rounds, and sunset mixers.",
      price: "KSh 2,500"
    },
    {
      title: "Masked Mystery Saturday",
      date: "January 18, 2025",
      time: "4:00 PM",
      location: "Private Creative Studio, Karen",
      description: "Mysterious speed dating with masks - reveal faces only after mutual agreement.",
      price: "KSh 3,000"
    },
    {
      title: "Movie on the Bus: Afrofuturism Night",
      date: "January 25, 2025",
      time: "7:00 PM",
      location: "Mobile Cinema Bus, Nairobi",
      description: "Watch Black Panther while cruising through Nairobi's nightlife scene.",
      price: "KSh 1,800"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Vibetribe signup:', { name, email, experience });
    alert('Welcome to the Vibetribe! We\'ll be in touch soon.');
    setName('');
    setEmail('');
    setExperience('');
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-br from-orange-500 via-purple-600 to-pink-600 rounded-3xl mb-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              We curate the vibes.<br />
              <span className="text-yellow-300">You make the memories.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              We specialize in unforgettable events, curated for modern Kenya.
            </p>
          </div>
        </div>
      </section>

      {/* Services Carousel */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">Our Signature Experiences</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Each experience is crafted to create authentic connections and unforgettable moments
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Upcoming Events */}
      <section className="py-16 bg-gray-50 rounded-3xl">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">🌟 Featured Upcoming Events</h2>
          <p className="text-xl text-gray-600 text-center mb-12">Don't miss out on these exciting experiences</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <EventCard {...event} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 mt-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">📩 Join the Vibetribe</h2>
              <p className="text-xl text-white/90">
                Get early access to exclusive events, merch drops & special invites.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-yellow-300"
                  required
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/70 focus:outline-none focus:border-yellow-300"
                  required
                />
              </div>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white mb-6 focus:outline-none focus:border-yellow-300"
                required
              >
                <option value="" className="text-gray-800">Select Your Favorite Experience</option>
                <option value="speed-dating" className="text-gray-800">💘 Speed Dating</option>
                <option value="movie-nights" className="text-gray-800">🍿 Movie Experiences</option>
                <option value="karaoke" className="text-gray-800">🎤 Karaoke & Music</option>
                <option value="corporate" className="text-gray-800">📸 Corporate Events</option>
                <option value="outdoor" className="text-gray-800">🏕️ Outdoor Adventures</option>
              </select>
              
              <button
                type="submit"
                className="w-full bg-yellow-400 text-purple-800 font-bold py-4 rounded-lg hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105"
              >
                Join the Vibetribe 🚀
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VibezKenyaContent;
