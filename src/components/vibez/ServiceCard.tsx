
import React from 'react';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  emoji: string;
  title: string;
  description: string;
  link: string;
  gradient: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ emoji, title, description, link, gradient }) => {
  return (
    <Link to={link} className="group">
      <div className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300`}>
        <div className="text-4xl mb-4">{emoji}</div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-white/90 text-sm leading-relaxed">{description}</p>
        <div className="mt-4 flex items-center text-white group-hover:translate-x-2 transition-transform duration-300">
          <span className="text-sm font-medium">Learn More</span>
          <span className="ml-2">→</span>
        </div>
      </div>
    </Link>
  );
};

export default ServiceCard;
