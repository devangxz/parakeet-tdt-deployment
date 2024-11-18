interface SubtitleOutput {
    srt: string;
    vtt: string;
}

export default function getSRTVTT(sbvContent: string): SubtitleOutput | null {
    try {
        // Validate input
        if (!sbvContent.trim()) {
            console.error('Empty SBV content provided');
            return null;
        }

        // Convert timestamps and split into lines for SRT
        const srtTextArr = sbvContent.trim()
            .replace(/(\d+):(\d+)\.(\d+),(\d+):(\d+)\.(\d+)/g, (_, h1, m1, s1, h2, m2, s2) => `00:${h1.padStart(2, '0')}:${m1.padStart(2, '0')}.${s1.padStart(3, '0')} --> 00:${h2.padStart(2, '0')}:${m2.padStart(2, '0')}.${s2.padStart(3, '0')}`)
            .split('\n');

        // Generate SRT content
        let srt = '';
        let paraCount = 0;
        srtTextArr.forEach((line, i) => {
            if (i % 3 === 0) {
                paraCount++;
                srt += `${paraCount}\r\n`;
            }
            srt += `${line.trim()}\r\n`;
        });

        // Generate VTT content
        let vtt = 'WEBVTT\r\n\r\n';
        const vttTextArr = sbvContent.trim()
            .replace(/(\d+):(\d+)\.(\d+),(\d+):(\d+)\.(\d+)/g, (_, h1, m1, s1, h2, m2, s2) => `00:${h1.padStart(2, '0')}:${m1.padStart(2, '0')}.${s1.padStart(3, '0')} --> 00:${h2.padStart(2, '0')}:${m2.padStart(2, '0')}.${s2.padStart(3, '0')}`)
            .split('\n');

        vttTextArr.forEach(line => {
            vtt += `${line.trim()}\r\n`;
        });

        return {
            srt,
            vtt
        };
    } catch (error) {
        console.error('Error generating subtitles:', error);
        return null;
    }
}