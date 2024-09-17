import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const renderTitleInputs = (
    cfd: string,
    setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
    const customFormattingDetails = JSON.parse(cfd)
    return Object.entries(customFormattingDetails)
        .filter(
            ([key]) =>
                /^(plaintiff|defendant|jurisdiction)_[0-9]+$/.test(key) ||
                [
                    'witness_name',
                    'date',
                    'start_time',
                    'end_time',
                    'reporter_name',
                    'job_number',
                ].includes(key)
        )
        .map(([key, value]) => (
            <div key={key} className='mb-5'>
                <Label htmlFor={key}>{key.replace(/_/g, ' ')}</Label>
                <Input
                    id={key}
                    placeholder={key.replace(/_/g, ' ')}
                    defaultValue={value as string}
                    onChange={(e) => {
                        const updatedDetails = {
                            ...customFormattingDetails,
                            [key]: e.target.value,
                        }
                        setCfd(JSON.stringify(updatedDetails))
                    }}
                />
            </div>
        ))
}

export default renderTitleInputs