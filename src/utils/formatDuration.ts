import { secondsToTs } from './secondsToTs';

const formatDuration = (seconds: number) => secondsToTs(seconds, seconds > 3600, 0);

export default formatDuration;