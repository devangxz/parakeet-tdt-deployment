import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CertificationInputs = (
    cfd: string,
    setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
    const customFormattingDetails = JSON.parse(cfd)
    const keysToRender = [
        'state',
        'county',
        'month_year',
        'day',
        'witness_name',
        'notary_name',
        'comm_no',
        'comm_exp',
        'reporter_name',
        'date',
    ]

    return Object.entries(customFormattingDetails)
        .filter(([key]) => keysToRender.includes(key))
        .map(([key, value]) => (
            <div key={key} className='mb-5'>
                <Label htmlFor={key}>{key.replace(/_/g, ' ')}</Label>
                <Input
                    id={key}
                    placeholder={key.replace(/_/g, ' ')}
                    defaultValue={value as string}
                    onChange={(e) => {
                        customFormattingDetails[key] = e.target.value
                        setCfd(JSON.stringify(customFormattingDetails))
                    }}
                />
            </div>
        ))
}

export default CertificationInputs