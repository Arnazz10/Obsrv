import { cn } from '../../lib/utils';

export function Alert({ className = '', tone = 'default', ...props }) {
  const tones = {
    default: 'border-white/10 bg-white/5',
    red: 'border-red-500/20 bg-red-500/10',
    amber: 'border-amber-500/20 bg-amber-500/10',
    blue: 'border-sky-500/20 bg-sky-500/10'
  };

  return <div className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone] || tones.default, className)} {...props} />;
}
