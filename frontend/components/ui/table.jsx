import { cn } from '../../lib/utils';

export function Table({ className = '', ...props }) {
  return <div className={cn('w-full overflow-hidden rounded-xl border border-white/10', className)} {...props} />;
}

export function TableHead({ className = '', ...props }) {
  return <div className={cn('grid bg-white/5 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400', className)} {...props} />;
}

export function TableRow({ className = '', ...props }) {
  return <div className={cn('grid border-t border-white/8 px-4 py-3 text-sm', className)} {...props} />;
}

export function TableCell({ className = '', ...props }) {
  return <div className={cn('min-w-0', className)} {...props} />;
}
