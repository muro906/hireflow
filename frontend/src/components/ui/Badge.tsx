import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
  dotColor?: string;
}

export function Badge({ className, variant = 'default', dotColor, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        {
          'bg-slate-800 text-slate-100': variant === 'default' && !dotColor,
          'bg-emerald-500/15 text-emerald-500': variant === 'success',
          'bg-amber-500/15 text-amber-500': variant === 'warning',
          'bg-rose-500/15 text-rose-500': variant === 'danger',
          'border border-slate-700 text-slate-300': variant === 'outline',
        },
        className
      )}
      style={dotColor ? { backgroundColor: `${dotColor}20`, color: dotColor } : undefined}
      {...props}
    >
      {dotColor && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      )}
      {children}
    </div>
  );
}
