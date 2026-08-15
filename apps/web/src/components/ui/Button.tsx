import { type ReactNode } from 'react'
import { clsx } from 'clsx'

type ButtonVariant = 'primary' | 'yellow' | 'outline' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  children?: ReactNode
  fullWidth?: boolean
  as?: 'button' | 'a'
  href?: string
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  yellow:  'btn btn-yellow',
  outline: 'btn btn-outline',
  danger:  'btn btn-danger',
  ghost:   'btn btn-outline border-transparent hover:border-ink',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-[10px] py-1.5 px-3 gap-1.5',
  md: 'py-2 px-4',
  lg: 'text-[13px] py-3 px-6',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full justify-center',
        className,
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
