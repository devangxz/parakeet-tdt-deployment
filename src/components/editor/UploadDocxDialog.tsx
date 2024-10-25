import { ReloadIcon } from "@radix-ui/react-icons";
import { FileUp } from "lucide-react";
import { Session } from "next-auth";
import { ChangeEvent } from "react";

import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { ButtonLoading, handleFilesUpload, uploadFile } from "@/utils/editorUtils";

type UploadDocxDialogProps = {
    orderDetails: OrderDetails;
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>;
    buttonLoading: ButtonLoading;
    setFileToUpload: React.Dispatch<React.SetStateAction<{ renamedFile: File | null; originalFile: File | null; isUploaded?: boolean }>>;
    fileToUpload: { renamedFile: File | null; originalFile: File | null; isUploaded?: boolean };
    session: Session | null;
};

const UploadDocxDialog = ({ orderDetails, setButtonLoading, buttonLoading, setFileToUpload, fileToUpload, session }: UploadDocxDialogProps) => (
    <Dialog>
        <DialogTrigger>
            <Button className='ml-2'>Upload File</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Upload Docx File</DialogTitle>
                <div className='pt-5'>
                    <div className='flex flex-col items-center p-[32px] rounded-[8px] border border-indigo-600 border-dashed md:w-full'>
                        <div className='flex gap-3 text-base font-medium leading-6'>
                            <FileUp />
                            <div className='mb-5'>Upload file</div>
                        </div>
                        {fileToUpload.originalFile && (
                            <div>{fileToUpload.originalFile.name}</div>
                        )}
                        <div className='flex gap-4 font-semibold text-indigo-600 leading-[133%]'>
                            <input
                                id='fileInput'
                                type='file'
                                multiple
                                hidden
                                onChange={(
                                    event: ChangeEvent<HTMLInputElement>
                                ) =>
                                    event.target.files &&
                                    handleFilesUpload({ files: event.target.files, type: 'files' }, orderDetails.fileId, setFileToUpload)
                                }
                                accept='docx'
                            />
                            <label
                                htmlFor='fileInput'
                                className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                            >
                                Choose File
                            </label>
                        </div>
                    </div>
                </div>
            </DialogHeader>
            <DialogClose asChild>
                <Button
                    disabled={buttonLoading.upload}
                    onClick={uploadFile.bind(null, fileToUpload, setButtonLoading, session, setFileToUpload, orderDetails.fileId)}
                >
                    {' '}
                    {buttonLoading.upload && (
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    )}{' '}
                    Upload File
                </Button>
            </DialogClose>
        </DialogContent>
    </Dialog>
)

export default UploadDocxDialog