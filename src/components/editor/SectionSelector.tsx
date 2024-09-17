import React from 'react';

import SectionButton from "./SectionButton";

interface SectionSelectorProps {
    selectedSection: string;
    sectionChangeHandler: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function SectionSelector({ selectedSection, sectionChangeHandler }: SectionSelectorProps) {
    return <div className='bg-white w-[12%] h-full rounded-2xl border border-gray-200 pt-4'>
        <SectionButton onClick={sectionChangeHandler} value="title" selectedSection={selectedSection}>Title</SectionButton>
        <SectionButton onClick={sectionChangeHandler} value="case-details" selectedSection={selectedSection}>Case details</SectionButton>
        <SectionButton onClick={sectionChangeHandler} value="proceedings" selectedSection={selectedSection}>Proceedings</SectionButton>
        <SectionButton onClick={sectionChangeHandler} value="certificates" selectedSection={selectedSection}>Certificates</SectionButton>
    </div>
}

export default SectionSelector;