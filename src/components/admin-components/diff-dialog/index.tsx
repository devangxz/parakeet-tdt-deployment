import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect, useCallback, memo } from 'react'
import { toast } from 'sonner'

import { getDiffFilesAction } from '@/app/actions/files/get-diff-files'
import { getTestDiffFilesAction } from '@/app/actions/files/get-test-diff-files'
import { Button } from '@/components/ui/button'
import { Dialog, DialogFooter, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { diff_match_patch, DIFF_INSERT, DIFF_DELETE, DmpDiff } from '@/utils/transcript/diff_match_patch'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const LoadingComponent = memo(() => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '20vh',
    }}
    className='gap-2'
  >
    <ReloadIcon className='h-4 w-4 animate-spin' />
    <p>Loading</p>
  </div>
));

LoadingComponent.displayName = 'LoadingComponent';

const OpenDiffDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [regularDiff, setRegularDiff] = useState<DmpDiff[]>([])
  const [masterToModifiedDiff, setMasterToModifiedDiff] = useState<DmpDiff[]>([])
  const [masterToSubmittedDiff, setMasterToSubmittedDiff] = useState<DmpDiff[]>([])
  const [modifiedToSubmittedDiff, setModifiedToSubmittedDiff] = useState<DmpDiff[]>([])
  const [loading, setLoading] = useState(false)
  const [isFailed, setIsFailed] = useState(false)
  const [isTestOrder, setIsTestOrder] = useState(false)
  const [activeTab, setActiveTab] = useState("master-modified")
  
  // Clear all diff data when dialog closes to prevent memory leaks
  const handleClose = useCallback(() => {
    setRegularDiff([])
    setMasterToModifiedDiff([])
    setMasterToSubmittedDiff([])
    setModifiedToSubmittedDiff([])
    setIsTestOrder(false)
    onClose()
  }, [onClose])
  
  function sanitizeDiff(diff: DmpDiff[]): DmpDiff[] {
    const result: DmpDiff[] = [];
  
    for (const [op, text] of diff) {
      if (text.endsWith('\n')) {
        const trimmed = text.slice(0, -1);
        if (trimmed) result.push([op, trimmed]);
        result.push([0, '\n']); // Always treat newlines as unchanged
      } else {
        result.push([op, text]);
      }
    }
  
    return result;
  }

  const loadDiff = useCallback(async () => {
    if (!fileId || fileId.length === 0) return
    try {
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
      toast.error('Failed to load diff')
      handleClose()
    }
  }, [fileId, activeTab, handleClose, isTestOrder])

  // Load diff when dialog opens or tab changes
  useEffect(() => {
    if (open && fileId.length > 0) {
      setLoading(true)
      loadDiff()
    }
    
    // Clean up when component unmounts or dialog closes
    return () => {
      if (!open) {
        setRegularDiff([])
        setMasterToModifiedDiff([])
        setMasterToSubmittedDiff([])
        setModifiedToSubmittedDiff([])
      }
    }
  }, [open, fileId, loadDiff])

  const renderDiff = (diff: DmpDiff[]) => {
    const sanitizedDiff = sanitizeDiff(diff)
    console.log(sanitizedDiff)
    return (
      <div className='diff whitespace-pre-wrap'>
        {sanitizedDiff.map((part, index) => {
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
      <DialogContent className='w-96 sm:w-full lg:max-w-4xl xl:max-w-6xl max-h-[90vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Diff</DialogTitle>
          <DialogDescription>
            {isTestOrder ? 'Compare test transcript versions' : 'Diff between ASR and QC outputs'}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 border rounded-md p-2 border-customBorder">
          {loading ? (
            <LoadingComponent />
          ) : isTestOrder ? (
            <Tabs 
              defaultValue="master-modified" 
              className="w-full"
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
              <TabsList className="w-full grid grid-cols-3">
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
              <TabsContent value="master-modified" className="p-4 border rounded-md mt-2">
                <div className='whitespace-pre-wrap'>
                 {isFailed ? <p>No diff available between Master and Modified versions</p> : masterToModifiedDiff.length > 0 ? renderDiff(masterToModifiedDiff) : <LoadingComponent />
                  }
                </div>
              </TabsContent>
              <TabsContent value="master-submitted" className="p-4 border rounded-md mt-2">
                <div className='whitespace-pre-wrap'>
                 {isFailed ? <p>No diff available between Master and Submitted versions</p> : masterToSubmittedDiff.length > 0 ? renderDiff(masterToSubmittedDiff) : <LoadingComponent />
                  }
                </div>
              </TabsContent>
              <TabsContent value="modified-submitted" className="p-4 border rounded-md mt-2">
                <div className='whitespace-pre-wrap'>
                 {isFailed ? <p>No diff available between Modified and Submitted versions</p> : modifiedToSubmittedDiff.length > 0 ? renderDiff(modifiedToSubmittedDiff) : <LoadingComponent />
                  }
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className='whitespace-pre-wrap'>
              {renderDiff(regularDiff)}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' onClick={handleClose}>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OpenDiffDialog
