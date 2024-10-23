import logger from "@/lib/logger";

const parseTimestamp = (timestamp: string, delimiter: string): string => {
    const [hours, minutes, seconds] = timestamp.split(':');
    const [sec, ms] = seconds.split('.');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${sec.padStart(2, '0')}${delimiter}${ms.padEnd(3, '0')}`;
};

const addSeconds = (
    time: string,
    secondsToAdd: number,
    delimiter: string,
): string => {
    const [hours, minutes, seconds] = time.split(':');
    const [sec, ms] = seconds.split('.');
    let totalSeconds =
        parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(sec) +
        secondsToAdd;
    const newHours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const newMinutes = Math.floor(totalSeconds / 60);
    const newSeconds = totalSeconds % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}${delimiter}${ms.padEnd(3, '0')}`;
};

export default function convertToSubtitles(
    transcriptionText: string,
    format: 'SRT' | 'VTT',
) {
    logger.info(`--> convertTo${format}`);
    const lines = transcriptionText.split('\n');
    let subtitles = format === 'VTT' ? 'WEBVTT\n\n' : '';
    const delimiter = format === 'VTT' ? '.' : ',';
    let counter = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // timestampRegex is used to match the timestamps given in the subtitles
        // 0:00:11.8 <Speaker Name>:
        // - 0:00:11.8 S1: ;
        // - 0:00:11.8 Mike Vacanti:
        const timestampRegex = /^(\d{1,2}:\d{2}:\d{2}\.\d)\s(.+):\s(.+)$/;
        const match = line.match(timestampRegex);
        if (match) {
            const [, time, speaker, text] = match;

            const startTime = parseTimestamp(time, delimiter);

            let nextTime = null;
            for (let j = i + 1; j < lines.length; j++) {
                const nextMatch = lines[j].trim().match(timestampRegex);
                if (nextMatch) {
                    nextTime = nextMatch[1];
                    break;
                }
            }

            const endTime = nextTime
                ? parseTimestamp(nextTime, delimiter)
                : addSeconds(time, 5, delimiter);

            subtitles += `${counter}\n${startTime} --> ${endTime}\n${speaker}: ${text}\n\n`;
            counter++;
        }
    }
    logger.info(`<-- convertTo${format}`);
    return subtitles;
};