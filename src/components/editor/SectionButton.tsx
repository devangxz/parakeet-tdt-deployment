import React, { ButtonHTMLAttributes, ReactNode } from 'react';

type SectionButtonProps = {
    children: ReactNode;
    selectedSection: string;
    value: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function SectionButton({ children, selectedSection, value, ...props }: SectionButtonProps) {
    return <button data-value={value} className={`block py-2 rounded-md font-medium hover:text-primary w-full text-start ${selectedSection === value ? 'text-primary' : ''}`} {...props}>{children}</button>
}