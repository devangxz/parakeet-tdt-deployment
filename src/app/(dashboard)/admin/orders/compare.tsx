'use client'

import axios from "axios"
import { Change, diffWords } from "diff"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ComparePage() {

    const [reviewDiff, setReviewDiff] = useState('asr')
    const [verificationDiff, setVerificationDiff] = useState('qc')
    const [fileId, setFileId] = useState('')
    const [diff, setDiff] = useState<Change[]>([])

    const compareFiles = async () => {
        const toastId = toast.loading('Processing your request...')
        try {

            if (!fileId) {
                toast.error('Please enter a file id')
                return;
            }

            const res = await axios.get(`/api/om/get-compare-files?reviewDiff=${reviewDiff}&verificationDiff=${verificationDiff}&fileId=${fileId}`)
            console.log(res.data)
            const diff = diffWords(res.data.reviewFile, res.data.verificationFile)
            setDiff(diff)
            toast.dismiss(toastId)
            toast.success('Files compared successfully')
        } catch (error) {
            toast.dismiss(toastId)
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : error instanceof Error
            if (errorMessage === 'Review file version not found') {
                toast.error('Version 1 file not found')
                return
            }
            if (errorMessage === 'Verification file version not found') {
                toast.error('Version 2 file not found')
                return
            }

            toast.error('Failed to compare files')

        }
    }

    return <div className='h-full flex-1 flex-col space-y-8 p-8 md:flex'>
        <div className='flex items-center justify-between space-y-2'>
            <div>
                <h1 className='text-lg font-semibold md:text-lg'>
                    Compare Files
                </h1>
            </div>
        </div>
        <div>
            <div className="border w-full h-96 rounded-sm overflow-y-scroll px-3">
                <div className='diff'>
                    {diff.map((part, index) => (
                        <span
                            key={index}
                            className={
                                part.added
                                    ? 'added'
                                    : part.removed
                                        ? 'removed'
                                        : ''
                            }
                        >
                            {part.value}
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex w-full justify-between mt-10">
                <div className="border rounded-sm w-[45%] py-2 px-5">
                    <h3>Version 1</h3>
                    <div className="my-5">
                        <Select onValueChange={setReviewDiff} defaultValue={reviewDiff}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                                {verificationDiff !== 'asr' && (
                                    <SelectItem value="asr">ASR</SelectItem>
                                )}
                                {verificationDiff !== 'qc' && (
                                    <SelectItem value="qc">QC Delivered</SelectItem>
                                )}
                                {verificationDiff !== 'customer-delivered' && (
                                    <SelectItem value="customer-delivered">Customer Delivered</SelectItem>
                                )}
                                {verificationDiff !== 'customer-edit' && (
                                    <SelectItem value="customer-edit">Customer Edit</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="border rounded-sm w-[45%] py-2 px-5">
                    <h3>Version 2</h3>
                    <div className="my-5">
                        <Select onValueChange={setVerificationDiff} defaultValue={verificationDiff}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                                {reviewDiff !== 'asr' && (
                                    <SelectItem value="asr">ASR</SelectItem>
                                )}
                                {reviewDiff !== 'qc' && (
                                    <SelectItem value="qc">QC Delivered</SelectItem>
                                )}
                                {reviewDiff !== 'customer-delivered' && (
                                    <SelectItem value="customer-delivered">Customer Delivered</SelectItem>
                                )}
                                {reviewDiff !== 'customer-edit' && (
                                    <SelectItem value="customer-edit">Customer Edit</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="flex justify-center items-end mt-10">
                <div className="w-1/2">
                    <Label htmlFor="fileId">File Id</Label>
                    <Input value={fileId} onChange={(e) => setFileId(e.target.value)} type="text" placeholder="File Id" id="fileId"></Input>
                </div>
                <Button className="ml-2" onClick={compareFiles}>Compare</Button>
            </div>
        </div>
    </div>
}
