const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
    } else {
        return `${pad(minutes)}:${pad(remainingSeconds)}`
    }
}

const pad = (num: number) => num.toString().padStart(2, '0')

export default formatDuration;