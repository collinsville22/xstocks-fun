import React from 'react';
import clsx from 'clsx';

export interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'column',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex',
        
        // Direction
        {
          'flex-row': direction === 'row',
          'flex-col': direction === 'column',
        },
        
        // Spacing
        {
          'gap-0': spacing === 'none',
          'gap-1': spacing === 'xs',
          'gap-2': spacing === 'sm',
          'gap-4': spacing === 'md',
          'gap-6': spacing === 'lg',
          'gap-8': spacing === 'xl',
        },
        
        // Align items
        {
          'items-start': align === 'start',
          'items-center': align === 'center',
          'items-end': align === 'end',
          'items-stretch': align === 'stretch',
        },
        
        // Justify content
        {
          'justify-start': justify === 'start',
          'justify-center': justify === 'center',
          'justify-end': justify === 'end',
          'justify-between': justify === 'between',
          'justify-around': justify === 'around',
        },
        
        className
      )}
    >
      {children}
    </div>
  );
};