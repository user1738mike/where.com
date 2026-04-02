import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gradient bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent mb-4">
              Vibez Connect
            </h3>
            <p className="text-gray-400 mb-4">
              We curate the vibes. You make the memories.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">WhatsApp: 0791173864</p>
              <p className="text-sm text-gray-400">vibezconnect@gmail.com</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <div className="space-y-2">
              <Link to="/talk-connect" className="block text-gray-400 hover:text-orange-400 transition-colors">Talk & Connect</Link>
              <Link to="/movie-experiences" className="block text-gray-400 hover:text-orange-400 transition-colors">Movie Experiences</Link>
              <Link to="/music-chill" className="block text-gray-400 hover:text-orange-400 transition-colors">Music & Chill</Link>
              <Link to="/corporate" className="block text-gray-400 hover:text-orange-400 transition-colors">Corporate Events</Link>
              <Link to="/outdoor" className="block text-gray-400 hover:text-orange-400 transition-colors">Outdoor Adventures</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/events" className="block text-gray-400 hover:text-orange-400 transition-colors">Events</Link>
              <Link to="/gallery" className="block text-gray-400 hover:text-orange-400 transition-colors">Gallery</Link>
              <Link to="/about" className="block text-gray-400 hover:text-orange-400 transition-colors">About</Link>
              <Link to="/contact" className="block text-gray-400 hover:text-orange-400 transition-colors">Contact</Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="space-y-2">
              <a href="#" className="block text-gray-400 hover:text-orange-400 transition-colors">Instagram</a>
              <a href="#" className="block text-gray-400 hover:text-orange-400 transition-colors">TikTok</a>
              <a href="#" className="block text-gray-400 hover:text-orange-400 transition-colors">WhatsApp</a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 Vibez Connect. All Rights Reserved. | Powered by AfriCall Solutions
          </p>
          <div className="mt-2 space-x-4">
            <Link to="#" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Terms & Policies</Link>
            <Link to="#" className="text-gray-400 hover:text-orange-400 text-sm transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
