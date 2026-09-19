import { cn } from '../../lib/utils';

export function Card({ className = '', ...props }) {
  return <div className={cn('rounded-2xl border border-white/10 bg-panel/80 shadow-panel backdrop-blur', className)} {...props} />;
}

export function CardHeader({ className = '', ...props }) {
  return <div className={cn('border-b border-white/8 px-5 py-4', className)} {...props} />;
}

export function CardTitle({ className = '', ...props }) {
  return <h3 className={cn('text-lg font-semibold tracking-tight', className)} {...props} />;
}

export function CardDescription({ className = '', ...props }) {
  return <p className={cn('text-sm text-slate-400', className)} {...props} />;
}

export function CardContent({ className = '', ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}
