import { Calendar, Star, Users } from 'lucide-react';
import { Button } from '@/components/vibez/ui/button';
import { Card, CardContent, CardHeader } from '@/components/vibez/ui/card';

interface MovieTheme {
  id: string;
  title: string;
  image: string;
  description: string;
  bonus: string;
  nextShowDate: string;
  rsvpLink: string;
  spotsLeft: number;
  price: string;
}

interface MovieCardProps {
  theme: MovieTheme;
  onRSVP: () => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ theme, onRSVP }) => {
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="p-0">
        <div 
          className="h-48 bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-4xl relative"
          style={{
            backgroundImage: theme.image ? `url(${theme.image})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {!theme.image && '🎬'}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-xl font-bold">{theme.title}</h3>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <p className="text-gray-600 text-sm mb-3 leading-relaxed">
          {theme.description}
        </p>
        
        <div className="flex items-center gap-1 mb-3 text-purple-600">
          <Star className="w-4 h-4" />
          <span className="text-sm font-medium">{theme.bonus}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{theme.nextShowDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{theme.spotsLeft} spots left</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-purple-600">{theme.price}</span>
          <Button 
            onClick={onRSVP}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            disabled={theme.spotsLeft === 0}
          >
            {theme.spotsLeft === 0 ? 'Sold Out' : 'Book Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MovieCard;
