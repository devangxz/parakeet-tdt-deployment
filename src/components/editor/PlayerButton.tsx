type PlayerButtonProps = {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
  disabled?: boolean
}

export default function PlayerButton({
  icon,
  tooltip,
  onClick,
  disabled,
}: PlayerButtonProps) {
  return (
    <button
      aria-label={tooltip}
      onClick={onClick}
      className={`flex items-center justify-center rounded-sm hover:bg-primary/10 active:scale-95 active:bg-primary/20 cursor-pointer w-8 h-8 transition-all duration-150 ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
    >
      {icon}
    </button>
  )
}
