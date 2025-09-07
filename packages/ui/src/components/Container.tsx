import React from 'react';
import clsx from 'clsx';

export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  size = 'lg',
}) => {
  return (
    <div
      className={clsx(
        'mx-auto px-4',
        {
          'max-w-sm': size === 'sm',
          'max-w-md': size === 'md', 
          'max-w-4xl': size === 'lg',
          'max-w-6xl': size === 'xl',
          'max-w-full': size === 'full',
        },
        className
      )}
    >
      {children}
    </div>
  );
};