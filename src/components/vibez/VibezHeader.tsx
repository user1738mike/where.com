import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown } from 'lucide-react';

const VibezHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/vibez" className="text-2xl font-bold text-gradient bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
            Vibez Connect
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/vibez" 
              className={`font-medium transition-colors ${isActive('/vibez') ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'}`}
            >
              Home
            </Link>
            <Link 
              to="/vibez/events" 
              className={`font-medium transition-colors ${isActive('/vibez/events') ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'}`}
            >
              Events
            </Link>
            
            {/* Services Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button className="flex items-center space-x-1 font-medium text-gray-700 hover:text-orange-500 transition-colors">
                <span>Services</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {isServicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <Link to="/vibez/talk-connect" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    💘 Talk & Connect - Speed Dating
                  </Link>
                  <Link to="/vibez/movie-experiences" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    🍿 Movie Experiences
                  </Link>
                  <Link to="/vibez/music-chill" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    🎤 Music & Chill
                  </Link>
                  <Link to="/vibez/corporate-events" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    📸 Corporate Events
                  </Link>
                  <Link to="/vibez/outdoor" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors">
                    🏕️ Outdoor Adventures
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  <Link to="/vibez/where" className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-500 transition-colors font-semibold">
                    🏘️ Where Connect - NEW!
                  </Link>
                </div>
              )}
            </div>

            <Link 
              to="/vibez/gallery" 
              className={`font-medium transition-colors ${isActive('/vibez/gallery') ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'}`}
            >
              Gallery
            </Link>
            <Link 
              to="/vibez/about" 
              className={`font-medium transition-colors ${isActive('/vibez/about') ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'}`}
            >
              About
            </Link>
            <Link 
              to="/vibez/contact" 
              className={`font-medium transition-colors ${isActive('/vibez/contact') ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'}`}
            >
              Contact
            </Link>
            <Link 
              to="/vibez/where" 
              className={`font-medium transition-colors px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:opacity-90`}
            >
              Where
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 bg-white border-t border-gray-200">
            <div className="py-2">
              <Link to="/vibez" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">Home</Link>
              <Link to="/vibez/events" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">Events</Link>
              <Link to="/vibez/talk-connect" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">💘 Talk & Connect</Link>
              <Link to="/vibez/movie-experiences" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">🍿 Movie Experiences</Link>
              <Link to="/vibez/music-chill" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">🎤 Music & Chill</Link>
              <Link to="/vibez/corporate-events" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">📸 Corporate Events</Link>
              <Link to="/vibez/outdoor" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">🏕️ Outdoor Adventures</Link>
              <div className="border-t border-gray-200 my-2"></div>
              <Link to="/vibez/where" className="block px-4 py-2 text-gray-700 hover:bg-orange-50 font-semibold">🏘️ Where Connect - NEW!</Link>
              <div className="border-t border-gray-200 my-2"></div>
              <Link to="/vibez/gallery" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">Gallery</Link>
              <Link to="/vibez/about" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">About</Link>
              <Link to="/vibez/contact" className="block px-4 py-2 text-gray-700 hover:bg-orange-50">Contact</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default VibezHeader;
