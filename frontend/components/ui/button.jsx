import { cn } from '../../lib/utils';

export function Button({ className = '', variant = 'default', ...props }) {
  const variants = {
    default: 'bg-sky-500 text-white hover:bg-sky-400',
    secondary: 'bg-white/8 text-slate-100 hover:bg-white/12 border border-white/10',
    ghost: 'bg-transparent text-slate-200 hover:bg-white/8'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400/50 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
