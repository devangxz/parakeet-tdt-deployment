const ActionButton = ({ children, onClick, first, last, tooltip }: { children: React.ReactNode, onClick?: () => void, first?: boolean, last?: boolean, tooltip: string }) => {
    const buttonStyles = `
        ${first ? 'rounded-l-2xl' : ''}
        ${last ? 'rounded-r-2xl border-r-0' : ''}
        border-r
        hover:bg-gray-100
        aspect-square
        flex
        items-center
        justify-center
        p-2
        transition-colors
        duration-200
        ease-in-out
    `;

    return (
        <button title={tooltip} className={buttonStyles} onClick={onClick}>
            {children}
        </button>
    );
};

export default ActionButton;