import React from 'react';
import clsx from 'clsx';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-solid border-t-transparent',
        {
          'w-4 h-4 border-2': size === 'sm',
          'w-6 h-6 border-2': size === 'md', 
          'w-8 h-8 border-3': size === 'lg',
        },
        'border-blue-600',
        className
      )}
    />
  );
};