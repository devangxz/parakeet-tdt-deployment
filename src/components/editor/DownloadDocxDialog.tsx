import { useSession } from "next-auth/react";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { FILE_CACHE_URL } from "@/constants";

type DownloadDocxDialogProps = {
    orderDetails: OrderDetails;
    downloadableType: string;
    setDownloadableType: React.Dispatch<React.SetStateAction<string>>;
};

const DownloadDocxDialog = ({ orderDetails, downloadableType, setDownloadableType }: DownloadDocxDialogProps) => {
    const { data: session } = useSession()

    return <Dialog>
        <DialogTrigger>
            <Button variant="outline">Download File</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    Choose transcript type to download
                </DialogTitle>
                <RadioGroup
                    defaultValue='marking'
                    onValueChange={setDownloadableType}
                    className='flex gap-10 mb-5'
                >
                    <div className='flex items-center space-x-2'>
                        <RadioGroupItem value='marking' id='marking' />
                        <Label htmlFor='marking'>With Markings</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                        <RadioGroupItem
                            value='no-marking'
                            id='no-marking'
                        />
                        <Label htmlFor='no-marking'>Without Markings</Label>
                    </div>
                </RadioGroup>
            </DialogHeader>
            <DialogClose asChild>
                {downloadableType === 'no-marking' ? <Button asChild>
                    <a target="_blank" href={`${FILE_CACHE_URL}/get-qc-txt/${orderDetails.fileId}?orgName=${orderDetails.orgName}&authToken=${session?.user?.token}`}>Download File</a>
                </Button>
                    :
                    <Button asChild>
                        <a target="_blank" href={`${FILE_CACHE_URL}/get-cf-docx/${orderDetails.fileId}?orgName=${orderDetails.orgName}&templateName=${orderDetails.templateName}&type=marking&authToken=${session?.user?.token}`}>Download File</a>
                    </Button>
                }

            </DialogClose>
        </DialogContent>
    </Dialog>
}

export default DownloadDocxDialog