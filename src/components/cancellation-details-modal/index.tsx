'use client'

import { CancellationStatus } from '@prisma/client'
import { CalendarIcon, PersonIcon } from '@radix-ui/react-icons'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import formatDateTime from '@/utils/formatDateTime'

interface CancellationsModalProps {
    isOpen: boolean
    onClose: () => void
    cancellations: {
        user: {
            firstname: string | null
            lastname: string | null
            email: string
        }
        id: number
        userId: number
        fileId: string
        reason: string
        createdAt: Date
        comment: string | null
        status: CancellationStatus
    }[]
}

export function CancellationDetailsModal({ isOpen, onClose, cancellations }: CancellationsModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Cancellation History</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Showing {cancellations.length} cancellation{cancellations.length !== 1 ? 's' : ''}
                    </p>
                </DialogHeader>
                <Separator className="my-4" />
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4">
                        {cancellations.map((cancellation) => (
                            <div key={cancellation.id} className="border rounded-lg p-6 space-y-3 hover:bg-muted/50 transition-colors mb-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="shrink-0 border rounded-md p-3 h-[72px] w-1/2">
                                        <div className="flex items-center gap-2">
                                            <PersonIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {cancellation.user.firstname} {cancellation.user.lastname}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {cancellation.user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border rounded-md p-3 h-[72px] w-1/2">
                                        <div className="flex flex-col justify-between h-full">
                                            <div className="flex">
                                                <Badge variant="outline" className="w-fit">
                                                    REVIEW
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>{formatDateTime(cancellation.createdAt.toISOString())}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-lg">
                                        {cancellation.reason}
                                    </h3>
                                    {cancellation.comment && (
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {cancellation.comment}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}