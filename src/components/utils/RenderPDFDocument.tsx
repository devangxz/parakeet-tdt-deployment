"use client"

import { memo, useState } from 'react';
import { pdfjs, Page, Document } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const MemoizedThirdPartyComponent = memo(Document);

function RenderDocument(props: { file: string }) {
    const [numPages, setNumPages] = useState(0)
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };
    const renderPages = () => {
        if (numPages === null) return null;

        return Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} width={window.innerWidth / 2} />
        ));
    };
    return <MemoizedThirdPartyComponent onLoadSuccess={onDocumentLoadSuccess} {...props}>{renderPages()}</MemoizedThirdPartyComponent>;
}

export default RenderDocument;