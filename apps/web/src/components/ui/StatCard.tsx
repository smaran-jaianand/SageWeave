import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | ReactNode
  icon?: ReactNode
  variant?: 'default' | 'dark' | 'red' | 'yellow'
  className?: string
}

const variantStyles = {
  default: {
    wrapper: 'bg-paper-bright border-2 border-ink',
    label: 'text-ink-dim',
    value: 'text-ink',
  },
  dark: {
    wrapper: 'bg-ink border-2 border-ink',
    label: 'text-accent-yellow',
    value: 'text-white',
  },
  red: {
    wrapper: 'bg-accent-red border-2 border-ink',
    label: 'text-red-200',
    value: 'text-white',
  },
  yellow: {
    wrapper: 'bg-paper-bright border-2 border-ink',
    label: 'text-accent-blue',
    value: 'text-ink',
  },
}

export function StatCard({ label, value, icon, variant = 'default', className = '' }: StatCardProps) {
  const styles = variantStyles[variant]
  return (
    <div className={`${styles.wrapper} p-5 flex items-start justify-between ${className}`}>
      <div className="flex flex-col gap-1">
        <span
          className={`font-mono text-[11px] font-semibold tracking-widest uppercase ${styles.label}`}
        >
          {label}
        </span>
        <span
          className={`font-heading font-bold text-[36px] leading-none tracking-tight mt-2 ${styles.value}`}
        >
          {value}
        </span>
      </div>
      {icon && (
        <div className="opacity-30 mt-1 flex-shrink-0">
          {icon}
        </div>
      )}
    </div>
  )
}
