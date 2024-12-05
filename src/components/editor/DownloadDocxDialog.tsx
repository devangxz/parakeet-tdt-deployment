import { ReloadIcon } from "@radix-ui/react-icons";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { ButtonLoading, downloadBlankDocx } from "@/utils/editorUtils";

type DownloadDocxDialogProps = {
    orderDetails: OrderDetails;
    downloadableType: string;
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>;
    buttonLoading: ButtonLoading;
    setDownloadableType: React.Dispatch<React.SetStateAction<string>>;
};

const DownloadDocxDialog = ({ orderDetails, downloadableType, setButtonLoading, buttonLoading, setDownloadableType }: DownloadDocxDialogProps) => (
    <Dialog>
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
                <Button
                    disabled={buttonLoading.download}
                    onClick={downloadBlankDocx.bind(null, { orderDetails, downloadableType, setButtonLoading })}
                >
                    {' '}
                    {buttonLoading.download && (
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    )}{' '}
                    Download File
                </Button>
            </DialogClose>
        </DialogContent>
    </Dialog>
)

export default DownloadDocxDialog