
type PlayerButtonProps = {
    icon: React.ReactNode
    tooltip: string
    onClick?: () => void
}

export default function PlayerButton({ icon, tooltip, onClick }: PlayerButtonProps) {
    return (
        <button
            aria-label={tooltip}
            onClick={onClick}
            className='w-8 h-8 bg-[#EEE9FF] flex items-center justify-center rounded p-1 mx-[2px]'
        >
            {icon}
        </button>
    )
}