const removeTimestamps = (transcript: string) => transcript.replace(/^\d+:[0-5][0-9]:[0-5][0-9]\.\d+\s/gm, ''); // this is the regex for removing timestamps

const removeSpeakerNames = (transcript: string) => transcript.replace(/(\d+:\d+:\d+\.\d+)\s+[^:]+:/g, '$1:'); // this is the regex for removing speaker names

const removeSpeakerNamesAndTimestamps = (transcript: string) => transcript.replace(/^\d+:[0-5][0-9]:[0-5][0-9]\.\d+\s+[^\:]+:\s/gm, '');

export { removeTimestamps, removeSpeakerNames, removeSpeakerNamesAndTimestamps };
