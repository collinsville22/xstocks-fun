import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = true, glow = false, ...props }, ref) => {
    return (
      // @ts-expect-error - Framer Motion type definition mismatch
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          // Trugly design - solid backgrounds
          "relative bg-white",
          "border-2 border-black",
          "rounded-2xl shadow-md overflow-hidden",

          // Hover effects
          hover && "hover:bg-playful-cream hover:shadow-lg",
          hover && "hover:border-playful-green transition-all duration-300",

          // Glow effect (optional)
          glow && "shadow-lg shadow-playful-green/20",

          className
        )}
        whileHover={hover ? { scale: 1.02 } : {}}

        {...props}
      >
        {/* Content - Trugly design uses clean, minimal styling */}
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };