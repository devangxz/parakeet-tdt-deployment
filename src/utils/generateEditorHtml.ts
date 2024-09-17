import { ConvertedASROutput, convertBlankToSeconds, convertTimestampToSeconds, generateRandomColor } from "./editorUtils";

function checkTimeStamp(timeStamp: string) {
    return /^\d+:[0-5][0-9]:[0-5][0-9].[0-9]$/.test(timeStamp);
}

function checkSpeakerName(speakerName: string) {
    if (/^(?!.*:.*:)[^:]+:$/.test(speakerName)) return true;
    if (/^\(--.*?--\):$/.test(speakerName)) return true;
    return false
}

const speakers: { [key: string]: string } = {}

const generateHTML = (transcript: string, ctms: ConvertedASROutput[], type: string) => { //TODO: need to add ctms to the function
    let html = '';
    let wordIndex = 0

    function getTimeStampHTML(item: string, speakerColor: string) {
        return `<span data-para-start="true" data-time="${convertTimestampToSeconds(item)}" class="font-semibold" style="color:${speakerColor}">${item} </span> `
    }

    function getSpeakerNameHTML(item: string, speakerColor: string) {
        if (/^(?!.*:.*:)[^:]+:$/.test(item)) {
            return `<span class="font-semibold" data-speaker-name=${item.slice(0, -1)} style="color:${speakerColor}">${item} </span>`
        }
        if (/^\(--.*?--\):$/.test(item)) {
            const speakerName = item.split("::").join(" ").replace(/\(|\)/g, "").replace(/--/g, " ");

            return `<span class="font-semibold" data-speaker-name=${speakerName} style="color:${speakerColor}">${speakerName} </span>`

        }
    }

    function getBlankHTML(item: string) {
        return `<span class="word-span text-lg" data-time-start=${convertBlankToSeconds(item)}>${item} </span>`
    }

    function getWordHTML(item: string, paraStartTime: number | null, timeStart: string, timeEnd: string) {
        return `<span class="word-span text-lg" data-index=${wordIndex} data-para-start-time=${paraStartTime} data-time-start=${timeStart} data-time-end=${timeEnd}>${item} </span>`
    }

    ctms = ctms.flat().filter((item: ConvertedASROutput | null) => item !== null);

    const transcriptArray = transcript.split('\n').map(para => {
        if (para === '') {
            return '\n'
        } else {
            return para
        }
    })

    transcriptArray.forEach((para) => {
        let paraStartTime: number | null = null
        if (para && ctms.length) {
            paraStartTime = ctms[wordIndex]?.start
        }
        const speakerNameRegex = /^([a-zA-Z0-9\p{L} \.\?\-]+?):/um;
        const match = para.match(speakerNameRegex);

        if (match && type === 'CF') {
            para = para.replace(match[1], `(--${match[1].split(" ").join('::')}--)`);
        }

        const examineePattern = /(.*?)\[--EXAMINEE--(.*?)--EXAMINEE--\](.*)/;
        const examineeMatches = para.match(examineePattern);
        if (examineeMatches) {

            const modifiedParaPart = examineeMatches[3].split(' ').map(word => {
                if (word !== "") {
                    return `[-${word}-]`
                }
            }).join(' ');
            para = `WHEREUPON, [--EXAMINEE--${examineeMatches[2].split(" ").join('::')}--EXAMINEE--] ${modifiedParaPart}`
        }

        const wordsArray = para.replace(/(?:(?!\n)\s)+/g, ' ').split(' ')

        wordsArray.forEach((item, index) => {
            // wrapping the timestamp and speakers initials in spans without the timestamps or any other css

            if (item !== '\n' && checkTimeStamp(item)) {
                const speakerName = wordsArray[index + 1]
                if (!speakers[speakerName]) {
                    speakers[speakerName] = generateRandomColor();
                }
                html += getTimeStampHTML(item, speakers[wordsArray[index + 1]])
            }
            if (checkTimeStamp(wordsArray[index - 1]) || (checkSpeakerName(item) && index === 0)) {
                if (!speakers[item]) {
                    speakers[item] = generateRandomColor()
                }
                html += getSpeakerNameHTML(item, speakers[item])
            }
            if (item !== '\n' && !(checkTimeStamp(item) || checkTimeStamp(wordsArray[index - 1]) || (checkSpeakerName(item) && index === 0))) {
                // wrapping each word in span with timestamps and all the css
                // checking if the current item is a blank and converting the formatted time into seconds

                if (/\[\d{1,2}:\d{2}:\d{2}\.\d\]/.test(item)) {
                    html += getBlankHTML(item)
                } else if (item === '____') {
                    html += `<span class="word-span text-lg">${item} </span>`
                } else {
                    const regex = /\b\w+-\w+\b/g;
                    const matches = item.match(regex)

                    const timeStart = ctms[wordIndex] ? (ctms[wordIndex].start).toString() : ''
                    let timeEnd = ctms[wordIndex] ? (ctms[wordIndex].end).toString() : ''
                    if (item.match(/\[--.*?--\]/)) {
                        const word = item.replace("::", " ")
                        html += `<span class="word-span text-lg" data-index=${wordIndex}>${word} </span>`
                        return;
                    } else if (/\[-.*?-\]/.test(item)) {
                        const word = item.replaceAll("[-", "").replaceAll("-]", "")
                        html += `<span class="word-span text-lg" data-index=${wordIndex}>${word} </span>`

                    } else if (matches) {
                        const length = item.split("-").length
                        timeEnd = ctms[wordIndex + length - 1] ? (ctms[wordIndex + length - 1].end).toString() : ''
                        html += getWordHTML(item, paraStartTime, timeStart, timeEnd)
                        wordIndex += length
                    } else if (item === "Q" || item === "A") {
                        html += `<span class="word-span text-lg" data-index=${wordIndex}>${item} </span>`
                    } else {
                        html += getWordHTML(item, paraStartTime, timeStart, timeEnd)
                        wordIndex++
                    }

                }
            }
            if (item === '\n') {
                html += '<br><br>'
            }
        })
    })

    return { html, speakers }
}

export default generateHTML;