import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { downloadBlankDocxAction } from "@/app/actions/editor/download-docx";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { FILE_CACHE_URL } from "@/constants";

type DownloadDocxDialogProps = {
    orderDetails: OrderDetails;
    downloadableType: string;
    setDownloadableType: React.Dispatch<React.SetStateAction<string>>;
};

const DownloadDocxDialog = ({ orderDetails, downloadableType, setDownloadableType }: DownloadDocxDialogProps) => {
    const { data: session } = useSession()
    const [docxUrl, setDocxUrl] = useState('')

    const getDocxUrl = async () => {
        const response = await downloadBlankDocxAction(
            orderDetails.fileId,
            downloadableType,
        )

        if (response.success && response.url) {
            setDocxUrl(response.url)
        }
    }

    useEffect(() => {
        if (orderDetails.status === 'FINALIZER_ASSIGNED' || orderDetails.status === 'PRE_DELIVERED') {
            getDocxUrl()
        }
    }, [])

    console.log(docxUrl)

    return <Dialog>
        <DialogTrigger>
            <Button onClick={() => getDocxUrl()} variant="outline">Download File</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    Choose transcript type to download
                </DialogTitle>
                <RadioGroup
                    value={downloadableType}
                    onValueChange={setDownloadableType}
                    className={`flex ${docxUrl ? 'gap-2' : 'gap-10'} mb-5`}
                >
                    <div className='flex items-center space-x-2'>
                        <RadioGroupItem disabled={!orderDetails.LLMDone} value='marking' id='marking' />
                        <Label htmlFor='marking'>With Markings</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <RadioGroupItem value='no-marking' id='no-marking' />
                        <Label htmlFor='no-marking'>Without Markings</Label>
                    </div>

                    {(orderDetails.status === 'FINALIZER_ASSIGNED' || orderDetails.status === 'PRE_DELIVERED') && <div className='flex items-center space-x-2'>
                        <RadioGroupItem disabled={!docxUrl} value='cf-rev-submit' id='cf-rev-submit' />
                        <Label htmlFor='cf-rev-submit'>CF File</Label>
                    </div>}
                </RadioGroup>
            </DialogHeader>
            <DialogClose asChild>
                <>
                    {downloadableType === 'no-marking' && <Button asChild>
                        <a target="_blank" href={`${FILE_CACHE_URL}/get-qc-txt/${orderDetails.fileId}?orgName=${orderDetails.orgName}&authToken=${session?.user?.token}`}>Download File</a>
                    </Button>
                    }
                    {downloadableType === 'marking' &&
                        <Button asChild>
                            <a target="_blank" href={`${FILE_CACHE_URL}/get-cf-docx/${orderDetails.fileId}?orgName=${orderDetails.orgName}&templateName=${orderDetails.templateName}&type=marking&authToken=${session?.user?.token}`}>Download File</a>
                        </Button>
                    }

                    {downloadableType === 'cf-rev-submit' &&
                        <Button asChild>
                            <a href={docxUrl} target='_blank'>Download File</a>
                        </Button>
                    }
                </>
            </DialogClose>
        </DialogContent>
    </Dialog>
}

export default DownloadDocxDialog