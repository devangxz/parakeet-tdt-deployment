import { ReloadIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { useState, useEffect, useCallback, memo } from 'react'
import { toast } from 'sonner'

import { getOrderDetailsAction } from '@/app/actions/editor/order-details'
import { getDiffFilesAction, getScreeningDiffFilesAction } from '@/app/actions/files/get-diff-files'
import { getTestDiffFilesAction } from '@/app/actions/files/get-test-diff-files'
import { OrderDetails } from '@/components/editor/EditorPage'
import SpeakerManager from '@/components/editor/SpeakerManager'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { diff_match_patch, DIFF_INSERT, DIFF_DELETE, DmpDiff, DIFF_EQUAL } from '@/utils/transcript/diff_match_patch'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  isScreeningFile?: boolean
}

const LoadingComponent = memo(() => (
  <div
    className='flex justify-center items-center h-full min-h-[10rem] gap-2'
  >
    <ReloadIcon className='h-4 w-4 animate-spin' />
    <p>Loading</p>
  </div>
));

LoadingComponent.displayName = 'LoadingComponent';

const OpenDiffDialog = ({ open, onClose, fileId, isScreeningFile = false }: DialogProps) => {
  const [regularDiff, setRegularDiff] = useState<DmpDiff[]>([])
  const [masterToModifiedDiff, setMasterToModifiedDiff] = useState<DmpDiff[]>([])
  const [masterToSubmittedDiff, setMasterToSubmittedDiff] = useState<DmpDiff[]>([])
  const [modifiedToSubmittedDiff, setModifiedToSubmittedDiff] = useState<DmpDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [isTestOrder, setIsTestOrder] = useState(false)
  const [activeTab, setActiveTab] = useState("master-modified")
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)  
  const [screeningDiff, setScreeningDiff] = useState<DmpDiff[]>([])
  const [assemblyAiTranscript, setAssemblyAiTranscript] = useState<string>('')
  const [hasCombinedVersion, setHasCombinedVersion] = useState(false)
  const [hasNoTranscripts, setHasNoTranscripts] = useState(false)
  
  // Clear all diff data when dialog closes to prevent memory leaks
  const handleClose = useCallback(() => {
    setRegularDiff([])
    setMasterToModifiedDiff([])
    setMasterToSubmittedDiff([])
    setModifiedToSubmittedDiff([])
    setScreeningDiff([])
    setAssemblyAiTranscript('')
    setHasCombinedVersion(false)
    setHasNoTranscripts(false)
    setIsTestOrder(false)
    setOrderDetails(null)
    onClose()
  }, [onClose])

  // Fetch order details for speakers tab
  const fetchOrderDetails = useCallback(async () => {
    if (!fileId || fileId.length === 0) return
    
    try {
      const response = await getOrderDetailsAction(fileId)
      
      if (response?.success && response.orderDetails) {
        const formattedDetails: OrderDetails = {
          orderId: response.orderDetails.orderId.toString(),
          userId: response.orderDetails.userId.toString(),
          duration: response.orderDetails.duration || '',
          fileId: response.orderDetails.fileId,
          orderType: response.orderDetails.orderType,
          filename: response.orderDetails.filename,
          templateName: response.orderDetails.templateName,
          orgName: response.orderDetails.orgName,
          cfd: response.orderDetails.cfd,
          status: response.orderDetails.status,
          instructions: response.orderDetails.instructions,
          remainingTime: response.orderDetails.remainingTime,
          LLMDone: response.orderDetails.LLMDone,
          customFormatOption: response.orderDetails.customFormatOption || undefined,
          outputFormat: response.orderDetails.outputFormat || undefined,
          supportingDocuments: response.orderDetails.supportingDocuments || [],
          email: response.orderDetails.email,
          speakerOptions: response.orderDetails.speakerOptions || [],
          isTestOrder: response.orderDetails.isTestOrder,
          pwer: response.orderDetails.pwer || 0,
          assignMode: response.orderDetails.assignMode || 'MANUAL',
        }
        
        setOrderDetails(formattedDetails)
      } else {
        throw new Error('Order details not found')
      }
    } catch (error) {
      console.error('Failed to load file details:', error)
      toast.error('Failed to load file details')
    }
  }, [fileId])
  
  const loadDiff = useCallback(async () => {
    if (!fileId || fileId.length === 0) return
    setLoading(true)
    try {
      if (isScreeningFile) {
        const screeningRes = await getScreeningDiffFilesAction(fileId)
        
        if (screeningRes.success) {
          if (screeningRes.assemblyAiFile && screeningRes.assemblyAiFile.length > 0) {
            setAssemblyAiTranscript(screeningRes.assemblyAiFile as string)
            
            if (screeningRes.hasCombinedVersion && screeningRes.combinedFile) {
              const { assemblyAiFile, combinedFile } = screeningRes
              const dmp = new diff_match_patch()
              const diff = dmp.diff_wordMode(assemblyAiFile as string, combinedFile as string)
              dmp.diff_cleanupSemantic(diff)
              setScreeningDiff(diff)
              setHasCombinedVersion(true)
            } else {
              setHasCombinedVersion(false)
            }
          } else {
            setHasNoTranscripts(true)
          }
        } else {
          setHasNoTranscripts(true)
        }
        
        setLoading(false)
        return
      }

      // First, check if this is a test order
      const testRes = await getTestDiffFilesAction(fileId)
      if (testRes.success && testRes.isTestOrder) {
        setIsTestOrder(true)
        let { masterContent, modifiedContent, submittedContent } = testRes
        const dmp = new diff_match_patch()
        
        // Load only the active tab's diff to save memory
        if (activeTab === "master-modified" && masterContent && modifiedContent) {
          masterContent = masterContent.replace(/\r\n|\r/g, '\n')
          modifiedContent = modifiedContent.replace(/\r\n|\r/g, '\n')
          const diff = dmp.diff_wordMode(masterContent, modifiedContent)
          dmp.diff_cleanupSemantic(diff)
          setIsFailed(diff.length > 0 ? false : true )
          setMasterToModifiedDiff(diff)
        } else if (activeTab === "master-submitted" && masterContent && submittedContent) {
          masterContent = masterContent.replace(/\r\n|\r/g, '\n')
          submittedContent = submittedContent.replace(/\r\n|\r/g, '\n')
          const diff = dmp.diff_wordMode(masterContent, submittedContent)
          dmp.diff_cleanupSemantic(diff)
          setIsFailed(diff.length > 0 ? false : true )
          setMasterToSubmittedDiff(diff)
        } else if (activeTab === "modified-submitted" && modifiedContent && submittedContent) {
          modifiedContent = modifiedContent.replace(/\r\n|\r/g, '\n')
          submittedContent = submittedContent.replace(/\r\n|\r/g, '\n')
          const diff = dmp.diff_wordMode(modifiedContent, submittedContent)
          dmp.diff_cleanupSemantic(diff)
          setIsFailed(diff.length > 0 ? false : true )
          setModifiedToSubmittedDiff(diff)
        }
      } else if(!isTestOrder){
        // This is a regular order, get the regular diff
        const res = await getDiffFilesAction(fileId)
        const { asrFile, qcFile } = res
        if (!asrFile || !qcFile) {
          throw new Error('Failed to load diff')
        }
        const dmp = new diff_match_patch()
        const diff = dmp.diff_wordMode(asrFile, qcFile)
        dmp.diff_cleanupSemantic(diff)
        setRegularDiff(diff)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      toast.error('Failed to load diff')
      handleClose()
    }
  }, [fileId, activeTab, handleClose, isTestOrder, isScreeningFile])
  
  // Load diff when dialog opens or tab changes
  useEffect(() => {
    if (open && fileId.length > 0) {
      loadDiff()
      fetchOrderDetails()
    }
    
    // Clean up when component unmounts or dialog closes
    return () => {
      if (!open) {
        setRegularDiff([])
        setMasterToModifiedDiff([])
        setMasterToSubmittedDiff([])
        setModifiedToSubmittedDiff([])
        setScreeningDiff([])
        setAssemblyAiTranscript('')
        setHasCombinedVersion(false)
        setHasNoTranscripts(false)
        setOrderDetails(null)
      }
    }
  }, [open, fileId, loadDiff, fetchOrderDetails])

  const renderDiff = (diff: DmpDiff[]) => {
    // Preprocess the diff to handle newlines better
  const processedDiff = [];

  for (let i = 0; i < diff.length; i++) {
    const [op, text] = diff[i];
    
    // Check if this is a deletion followed by an insertion and both end with newlines
    if (op === DIFF_DELETE && 
        i + 1 < diff.length && 
        diff[i+1][0] === DIFF_INSERT &&
        text.endsWith('\n') && 
        diff[i+1][1].endsWith('\n')) {
      
      // Extract the text without the newline
      const deleteText = text.slice(0, -1);
      const insertText = diff[i+1][1].slice(0, -1);
      
      // Add the modified parts
      processedDiff.push([DIFF_DELETE, deleteText]);
      processedDiff.push([DIFF_INSERT, insertText]);
      
      // Add the newline as unchanged content
      processedDiff.push([DIFF_EQUAL, '\n']);
      
      // Skip the next item since we've already processed it
      i++;
    } else {
      // Add the original diff part
      processedDiff.push(diff[i]);
    }
  }

    return (
      <div className=''>
        {processedDiff.map((part, index) => {
          const [op, text] = part
          if (text === '\n') {
            return <br key={index} />;
          }
          if (op === DIFF_INSERT) {
            return <ins key={index} className='added'>{text}</ins>
      } else if (op === DIFF_DELETE) {
        return <del key={index} className='removed'>{text}</del>
      }
          return <span key={index}>{text}</span>
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col'>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Diff</DialogTitle>
          <DialogDescription>
            {isScreeningFile ? 'Diff between AssemblyAI and AssemblyAI + GPT-4o Transcribe outputs' : 
             isTestOrder ? 'Compare test transcript versions' : 
             'Diff between ASR and QC outputs'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="diff" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start flex-shrink-0">
            <TabsTrigger value="diff">Diff</TabsTrigger>
            {!isScreeningFile && <TabsTrigger value="speakers">Speakers</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="diff" className='flex-1 flex flex-col min-h-0 overflow-hidden'>
            <div className="flex-1 border rounded-md border-customBorder flex flex-col min-h-0">
              {loading ? (
                <LoadingComponent />
              ) : isScreeningFile ? (
                <div className='whitespace-pre-wrap p-4 overflow-y-auto h-full'>
                  {hasNoTranscripts ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-lg font-medium mb-2">No transcripts available</p>
                    </div>
                  ) : hasCombinedVersion ? (
                    renderDiff(screeningDiff)
                  ) : assemblyAiTranscript ? (
                    <div>
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-yellow-800 font-medium flex items-center gap-2">
                          <InfoCircledIcon className="h-4 w-4" />
                          AssemblyAI + GPT-4o Transcribe transcript not available, showing AssemblyAI transcript only
                        </p>
                      </div>
                      <div>{assemblyAiTranscript}</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-lg font-medium mb-2">No transcripts available</p>
                    </div>
                  )}
                </div>
              ) : isTestOrder ? (
                <Tabs 
                  defaultValue="master-modified" 
                  className="w-full h-full flex flex-col min-h-0"
                  value={activeTab}
                  onValueChange={(value) => {
                    setActiveTab(value)
                    if(value === "master-modified" && masterToModifiedDiff.length === 0){
                      loadDiff()
                    } else if(value === "master-submitted" && masterToSubmittedDiff.length === 0){
                      loadDiff()
                    } else if(value === "modified-submitted" && modifiedToSubmittedDiff.length === 0){
                      loadDiff()
                    }
                  }}
                >
                  <TabsList className="w-full grid grid-cols-3 flex-shrink-0">
                    <TabsTrigger 
                      value="master-modified" 
                      className={`${activeTab === "master-modified" ? "font-medium bg-primary text-primary-foreground" : ""}`}
                    >
                      Master → Modified
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="master-submitted" 
                      className={`${activeTab === "master-submitted" ? "font-medium bg-primary text-primary-foreground" : ""}`}
                    >
                      Master → Submitted
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="modified-submitted" 
                      className={`${activeTab === "modified-submitted" ? "font-medium bg-primary text-primary-foreground" : ""}`}
                    >
                      Modified → Submitted
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="master-modified" className="p-4 border rounded-md mt-2 flex-1 overflow-y-auto">
                    <div className='whitespace-pre-wrap'>
                     {isFailed ? <p>No diff available between Master and Modified versions</p> : masterToModifiedDiff.length > 0 ? renderDiff(masterToModifiedDiff) : <LoadingComponent />
                      }
                    </div>
                  </TabsContent>
                  <TabsContent value="master-submitted" className="p-4 border rounded-md mt-2 flex-1 overflow-y-auto">
                    <div className='whitespace-pre-wrap'>
                     {isFailed ? <p>No diff available between Master and Submitted versions</p> : masterToSubmittedDiff.length > 0 ? renderDiff(masterToSubmittedDiff) : <LoadingComponent />
                      }
                    </div>
                  </TabsContent>
                  <TabsContent value="modified-submitted" className="p-4 border rounded-md mt-2 flex-1 overflow-y-auto">
                    <div className='whitespace-pre-wrap'>
                     {isFailed ? <p>No diff available between Modified and Submitted versions</p> : modifiedToSubmittedDiff.length > 0 ? renderDiff(modifiedToSubmittedDiff) : <LoadingComponent />
                      }
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className='whitespace-pre-wrap p-4 overflow-y-auto h-full'>
                  {renderDiff(regularDiff)}
                </div>
              )}
            </div>
          </TabsContent>
          
          {!isScreeningFile && (
            <TabsContent value="speakers" className="flex-1 min-h-0 overflow-y-auto">
              <div className="h-full flex-1 border rounded-md border-customBorder overflow-hidden">
                { orderDetails ? (
                  <SpeakerManager 
                    orderDetails={orderDetails} 
                    isDialog={true}
                    isDiffDialog={true}
                  />
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p>Failed to load speaker information</p>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        <DialogFooter className="flex-shrink-0 mt-4">
          <DialogClose asChild>
            <Button variant='outline' onClick={handleClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OpenDiffDialog
