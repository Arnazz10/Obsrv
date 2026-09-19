import { cn } from '../../lib/utils';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20',
        className
      )}
      {...props}
    />
  );
}
