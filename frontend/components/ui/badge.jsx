import { cn } from '../../lib/utils';

export function Badge({ className = '', tone = 'default', ...props }) {
  const tones = {
    default: 'bg-white/10 text-slate-100',
    blue: 'bg-sky-500/15 text-sky-300 border border-sky-500/20',
    amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
    red: 'bg-red-500/15 text-red-300 border border-red-500/20',
    darkred: 'bg-red-950/60 text-red-200 border border-red-700/30'
  };

  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', tones[tone] || tones.default, className)} {...props} />;
}
