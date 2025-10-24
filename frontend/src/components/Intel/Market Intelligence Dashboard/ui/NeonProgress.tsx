import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../../lib/utils';

interface NeonProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
  showValue?: boolean;
  animated?: boolean;
  className?: string;
}

const NeonProgress: React.FC<NeonProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showValue = true,
  animated = true,
  className
}) => {
  const percentage = (value / max) * 100;
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6'
  };

  const colorClasses = {
    blue: 'from-cyan-400 to-blue-500 shadow-cyan-500/50',
    green: 'from-emerald-400 to-green-500 shadow-emerald-500/50',
    red: 'from-red-400 to-pink-500 shadow-red-500/50',
    purple: 'from-playful-green to-playful-green shadow-playful-green/50',
    yellow: 'from-yellow-400 to-orange-500 shadow-yellow-500/50'
  };

  const glowColors = {
    blue: 'shadow-cyan-500/50',
    green: 'shadow-emerald-500/50',
    red: 'shadow-red-500/50',
    purple: 'shadow-playful-green/50',
    yellow: 'shadow-yellow-500/50'
  };

  return (
    <div className={cn('relative', className)}>
      {/* Background track */}
      <div
        className={cn(
          'w-full bg-gray-200/20 dark:bg-gray-700/20 rounded-full overflow-hidden',
          'backdrop-blur-sm border border-black/30/20 dark:border-black/10/20',
          sizeClasses[size]
        )}
      >
        {/* Progress fill */}
        <motion.div
          className={cn(
            'h-full rounded-full relative overflow-hidden',
            'bg-gradient-to-r',
            colorClasses[color],
            animated && 'animate-pulse'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Neon glow effect */}
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-gradient-to-r',
              colorClasses[color],
              'blur-md opacity-75'
            )}
          />

          {/* Shimmer effect */}
          <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </motion.div>
      </div>

      {/* Value display */}
      {showValue && (
        <motion.div
          className={cn(
            'mt-2 text-sm font-mono font-bold',
            color === 'blue' && 'text-cyan-400',
            color === 'green' && 'text-emerald-400',
            color === 'red' && 'text-red-400',
            color === 'purple' && 'text-primary-400',
            color === 'yellow' && 'text-yellow-400'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {value.toFixed(2)} / {max} ({percentage.toFixed(1)}%)
        </motion.div>
      )}
    </div>
  );
};

export { NeonProgress };