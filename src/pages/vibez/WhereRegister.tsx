import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WhereHeader from '../../components/vibez/where/WhereHeader';
import RegistrationSteps from '../../components/vibez/where/RegistrationSteps';

const WhereRegister = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();

  const handleRegistrationComplete = () => {
    navigate('/vibez/where/dashboard');
  };

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-20 right-[10%] w-[300px] h-[300px] bg-where-teal/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 left-[10%] w-[400px] h-[400px] bg-where-coral/10 rounded-full blur-[100px]" />

      <WhereHeader showBackArrow={false} />

      <div className="pt-24 pb-16 relative z-10">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Join Your <span className="gradient-text">Neighborhood</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Create your profile to start connecting with neighbors
              </p>
            </div>

            <RegistrationSteps onComplete={handleRegistrationComplete} />
          </motion.div>
        </div>
      </div>
    </div>
  );
});

WhereRegister.displayName = 'WhereRegister';

export default WhereRegister;
