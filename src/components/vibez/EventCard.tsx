import { forwardRef } from 'react';
import { Calendar, MapPin } from 'lucide-react';

interface EventCardProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image?: string;
  price?: string;
}

const EventCard = forwardRef<HTMLDivElement, EventCardProps>(({ title, date, time, location, description, image, price }, ref) => {
  return (
    <div ref={ref} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="h-48 bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-6xl">🎉</div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3">{title}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span className="text-sm">{date} at {time}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="text-sm">{location}</span>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{description}</p>
        
        <div className="flex items-center justify-between">
          {price && (
            <span className="text-lg font-bold text-orange-500">{price}</span>
          )}
          <button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105">
            Join Event
          </button>
        </div>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
