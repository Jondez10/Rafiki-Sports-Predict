import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  key?: React.Key;
}

export default function TiltCard({ children, className = '', onClick }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Track cursor position normalized between 0 and 1
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  // Smooth out motion value changes using spring configuration
  const springConfig = { damping: 25, stiffness: 350, mass: 0.5 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  // Map normalized coordinates to rotation angles (subtle degrees for smooth, non-distracting look)
  const rotateX = useTransform(smoothY, [0, 1], [6, -6]);
  const rotateY = useTransform(smoothX, [0, 1], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Normalized position
    const mouseX = (e.clientX - rect.left) / width;
    const mouseY = (e.clientY - rect.top) / height;

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    // Reset to center smoothly
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{
        scale: 1.018,
        boxShadow: "0 20px 30px -10px rgba(0, 0, 0, 0.5), 0 10px 15px -10px rgba(0, 0, 0, 0.4)",
        borderColor: "rgba(245, 158, 11, 0.25)" // Subtle warm/amber border glow on hover
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`relative transition-colors duration-200 select-none ${className}`}
      id="tilt-card-container"
    >
      {/* Perspective wrapper layer */}
      <div 
        style={{ transform: 'translateZ(30px)' }} 
        className="w-full h-full flex flex-col justify-between"
      >
        {children}
      </div>
    </motion.div>
  );
}
