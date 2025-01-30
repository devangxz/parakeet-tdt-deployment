type PlayerButtonProps = {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
}

export default function PlayerButton({
  icon,
  tooltip,
  onClick,
}: PlayerButtonProps) {
  return (
    <button
      aria-label={tooltip}
      onClick={onClick}
      className='flex items-center justify-center rounded-sm hover:bg-primary/10 active:scale-95 active:bg-primary/20 cursor-pointer w-8 h-8 transition-all duration-150'
    >
      {icon}
    </button>
  )
}
