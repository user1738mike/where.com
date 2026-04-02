import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/vibez/ui/carousel";
import MovieCard from './MovieCard';

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

interface MovieCarouselProps {
  movieThemes: MovieTheme[];
  onRSVP: (themeId: string) => void;
}

const MovieCarousel: React.FC<MovieCarouselProps> = ({ movieThemes, onRSVP }) => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {movieThemes.map((theme) => (
            <CarouselItem key={theme.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <MovieCard 
                theme={theme}
                onRSVP={() => onRSVP(theme.id)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

export default MovieCarousel;
