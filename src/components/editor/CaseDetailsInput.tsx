import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CaseDetailsInputs = (
    cfd: string,
    setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
    const customFormattingDetails = JSON.parse(cfd)
    const regexPatterns = [
        /^plaintiff_[0-9]+_law_firm_name_[0-9]+$/,
        /^plaintiff_[0-9]+_law_firm_[0-9]+_address_[0-9]+$/,
        /^plaintiff_[0-9]+_law_firm_[0-9]+_attorney_name_[0-9]+$/,
        /^plaintiff_[0-9]+_law_firm_[0-9]+_attorney_email_[0-9]+$/,
        /^plaintiff_[0-9]+$/,
        /^defendant_[0-9]+_law_firm_name_[0-9]+$/,
        /^defendant_[0-9]+_law_firm_[0-9]+_address_[0-9]+$/,
        /^defendant_[0-9]+_law_firm_[0-9]+_attorney_name_[0-9]+$/,
        /^defendant_[0-9]+_law_firm_[0-9]+_attorney_email_[0-9]+$/,
        /^defendant_[0-9]+$/,
        /^also_present_[0-9]+$/,
    ]

    return Object.entries(customFormattingDetails)
        .filter(([key]) => regexPatterns.some((pattern) => pattern.test(key)))
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

export default CaseDetailsInputs