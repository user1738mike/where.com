import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/vibez/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/vibez/ui/card';

interface Showtime {
  id: string;
  theme: string;
  date: string;
  venue: string;
  startTime: string;
  spotsLeft: number;
  price: string;
}

interface ShowtimesTableProps {
  showtimes: Showtime[];
  onRSVP: (showtimeId: string) => void;
}

const ShowtimesTable: React.FC<ShowtimesTableProps> = ({ showtimes, onRSVP }) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          Upcoming Movie Nights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Theme</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date & Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Venue</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Spots Left</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Price</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {showtimes.map((showtime) => (
                <tr key={showtime.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-purple-600">{showtime.theme}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{showtime.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 mt-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{showtime.startTime}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{showtime.venue}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className={`font-medium ${showtime.spotsLeft <= 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {showtime.spotsLeft}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-bold text-purple-600">{showtime.price}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Button
                      onClick={() => onRSVP(showtime.id)}
                      size="sm"
                      disabled={showtime.spotsLeft === 0}
                      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                    >
                      {showtime.spotsLeft === 0 ? 'Sold Out' : 'RSVP'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShowtimesTable;
