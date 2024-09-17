import React, { ButtonHTMLAttributes, ReactNode } from 'react';

type SectionButtonProps = {
    children: ReactNode;
    selectedSection: string;
    value: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function SectionButton({ children, selectedSection, value, ...props }: SectionButtonProps) {
    return <button data-value={value} className={`block py-2 px-4 font-medium hover:bg-[#F7F5FF] hover:text-[#6442ED] w-full text-start ${selectedSection === value ? 'bg-[#F7F5FF] text-[#6442ED]' : ''}`} {...props}>{children}</button>
}