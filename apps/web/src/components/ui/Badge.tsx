import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'yellow' | 'blue' | 'red' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClass: Record<BadgeVariant, string> = {
  default: 'badge',
  yellow:  'badge badge-yellow',
  blue:    'badge badge-blue',
  red:     'badge badge-red',
  muted:   'badge badge-muted',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={clsx(variantClass[variant], className)}>
      {children}
    </span>
  )
}
