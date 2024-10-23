import { DialogTitle } from "@radix-ui/react-dialog";
import { ReloadIcon } from "@radix-ui/react-icons";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader } from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { OrderDetails } from "@/app/editor/[fileId]/page";
import { ButtonLoading, reportHandler } from "@/utils/editorUtils";

interface ReportDialogProps {
    reportModalOpen: boolean;
    setReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    reportDetails: {
        reportOption: string;
        reportComment: string;
    };
    setReportDetails: React.Dispatch<React.SetStateAction<{ reportOption: string; reportComment: string }>>;
    orderDetails: OrderDetails;
    buttonLoading: {
        report: boolean;
    };
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>;
}

const reportReasonMap = {
    HIGH_ERROR_RATE: 'High Error Rate',
    INCOMPLETE: 'Incomplete',
    INCORRECT_PARAGRAPH_BREAKS: 'Incorrect Paragraph Breaks',
    DOES_NOT_MATCH_AUDIO: 'Does Not Match Audio',
    HIGH_DIFFICULTY: 'High Difficulty',
    NETWORK_ERROR: 'Network Error',
    NO_SPOKEN_AUDIO: 'No Spoken Audio',
    GUIDELINE_VIOLATIONS: 'Guideline Violations',
    ONLY_BACKGROUND_CONVERSATION: 'Only Background Conversation',
    ONLY_MUSIC: 'Only Music',
    OTHER: 'Other',
}

const ReportDialog = ({ reportModalOpen, setReportModalOpen, reportDetails, setReportDetails, orderDetails, buttonLoading, setButtonLoading }: ReportDialogProps) => (
    <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Report File</DialogTitle>
                <DialogDescription>
                    Choose a reason and add your comment for reporting.
                </DialogDescription>
                <div className='flex flex-col h-60 justify-between'>
                    <Select
                        value={reportDetails.reportOption}
                        onValueChange={(value) =>
                            setReportDetails((prevValue) => ({
                                ...prevValue,
                                reportOption: value,
                            }))
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder='Select a reason' />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(reportReasonMap).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div>
                        <Label htmlFor='report-comment'>Enter Comment</Label>
                        <Textarea
                            rows={4}
                            onChange={(e) =>
                                setReportDetails((prevValue) => ({
                                    ...prevValue,
                                    reportComment: e.target.value,
                                }))
                            }
                            id='report-comment'
                            placeholder='Enter your comment...'
                        />
                    </div>
                    <Button
                        variant='destructive'
                        onClick={() => reportHandler(reportDetails, orderDetails.orderId, setButtonLoading, setReportModalOpen, setReportDetails)}
                        disabled={buttonLoading.report}
                    >
                        {' '}
                        {buttonLoading.report && (
                            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                        )}{' '}
                        Report
                    </Button>
                </div>
            </DialogHeader>
        </DialogContent>
    </Dialog>
)

export default ReportDialog