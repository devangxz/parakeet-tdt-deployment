/* eslint-disable react/no-unescaped-entities */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

import { updateSignOffStatus } from '@/app/actions/transcriber/accept-terms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TermsAndConditionsModalProps {
  open: boolean
}

export function TermsAndConditionsModal({
  open,
}: TermsAndConditionsModalProps) {
  const [modalOpen, setModalOpen] = useState(open)
  const [initials, setInitials] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    if (!initials.trim()) return
    setIsLoading(true)
    try {
      await updateSignOffStatus()
      setModalOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={modalOpen} modal={true}>
      <DialogContent className='sm:max-w-[900px]'>
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please sign and accept the Terms & Conditions to continue
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-[400px] overflow-y-auto my-6'>
          <div className='space-y-6'>
            <div className='text-center'>
              <strong>Version 1.1</strong>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Acceptance of Terms</h4>
              <p className='mt-2 text-sm'>
                By using Scribie.ai web site ("Service"), all services of
                Scribie Technologies, you are agreeing to be bound by the
                following terms and conditions ("Freelance Transcription Program
                Terms and Conditions"), including any subsequent changes or
                modifications to them. If you do not agree to these Terms please
                do not use the Scribie.ai website or services.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Confidentiality</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that you will not retain, distribute,
                share or disseminate in any way in part or in full the file or
                its contents. After the file is complete and submitted back, you
                will remove the file and the contents from your computer. You
                will not store them beyond what is necessary for providing the
                end product.
              </p>
              <p className='mt-2 text-sm'>
                In case of evidence to the contrary your account may be
                suspended and we may initiate legal action against you.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Delegation</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that you will not delegate the
                selected assignments to any other person or parties. In case of
                evidence to the contrary your account may be suspended.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Legal Name & Address</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that you will provide your legal name
                and full residential address in your Scribie.ai account. Any
                incorrect information may lead to account suspension. Please
                note Scribie does not accept applications/transcribers from
                residents of California, US.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Duplicate Accounts</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that you will not create duplicate
                accounts and/or submit duplicate applications and/or delete your
                account and reapply for the transcription test. In case of
                evidence to the contrary your account(s) may be suspended.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Non-transferable</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that your account on Scribie.ai is
                non-transferable and you will not sell or transfer ownership of
                your account to other persons or parties. In case of evidence to
                the contrary your account may be suspended. You may however
                delete your account anytime you wish.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Privacy</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and authorize us to collect and store personal
                information such as cookies, IP addresses and other information
                which is required for payments, identification, authentication,
                service improvement, research, and contact. We do not sell, rent
                or share personal information with third parties without your
                prior consent. We may, however, disclose personal information
                when we believe it violates our terms and conditions or is
                appropriate to comply with the law, to protect our or our users'
                rights, as well as to protect our users from fraudulent,
                abusive, and unlawful use of the Service.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Dispute Resolution</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that the final decision regarding a
                review dispute as judged by Scribie.ai administrators is binding
                and you are willing to accept the decision. Refusal to accept
                the decision constitutes a violation of this Terms and
                Conditions.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>
                Minimum Quality Standard
              </h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that you will abide by the minimum
                quality standard as prescribed in the transcription guidelines.
                Any submissions which do not meet the criteria will be rejected.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Payments</h4>
              <p className='mt-2 text-sm'>
                You acknowledge and agree to our payment rules as stated on our
                website. We reserve the right to change our payment rules at our
                discretion.
              </p>
              <p className='mt-2 text-sm'>
                Scribie Techologies issues payments via PayPal. You are solely
                responsible to maintain the correct information regarding your
                PayPal account. In case of non receipt of payments you may ask
                for the transaction id for the payment and follow up with PayPal
                customer service.
              </p>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that we may decline to process a
                payment request for any reason or withhold it for an indefinite
                time.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>
                Accounts, passwords and Security
              </h4>
              <p className='mt-2 text-sm'>
                You must be a registered user to access the Service. You are
                responsible for keeping your password secure. You will be solely
                responsible and liable for any activity that occurs under your
                registered email address.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>
                Acceptable Use and Conduct
              </h4>
              <p className='mt-2 text-sm'>
                You are solely responsible for your conduct and your data
                related to the Service. You agree to indemnify, defend, and hold
                harmless Scribie Techologies and its suppliers from any and all
                loss, cost, liability, and expense arising from or related to
                your data, your use of the Service, or your violation of these
                terms.
              </p>
              <p className='mt-2 text-sm'>
                Any unauthorized use of any Scribie Techologies's Service is a
                violation of this Agreement and certain federal and state laws.
                Such violations may subject the unauthorized user and his or her
                agents to civil and criminal penalties.
              </p>
              <p className='mt-2 text-sm'>
                Scribie.ai has a strict policy on abusive behaviour, derogatory
                language and threats directed towards Scribie Technologies, the
                employees of Scribie Technologies or any users of the Service.
                Your account may be suspended and your attempts to contact
                support will be ignored.
              </p>
              <p className='mt-2 text-sm'>
                Any attempt to contact persons who are directly or indirectly
                referred to in any particular file is a violation of this
                agreement and may lead to account suspension.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>
                No Warranties or Representations
              </h4>
              <p className='mt-2 text-sm'>
                You understand and agree that the Service is provided "as is"
                and Scribie Techologies, its affiliates, suppliers and Resellers
                expressly disclaim all warranties of any kind, beyond the
                Refund, express or implied, including without limitation any
                warranty of merchantability, fitness for a particular purpose,
                non-infringement or bailment of your data on Scribie
                Techologies's servers. Scribie Techologies, its affiliates,
                suppliers and Resellers make no warranty or representation,
                other than the Refund, regarding the results that may be
                obtained from the use of the Service, the security of the
                Service, or that the Service will meet any user's requirements
                beyond the Refund. Use of the Service is at your sole risk. You
                will be solely responsible for any damage to you resulting from
                the use of the Service. The entire risk arising out of use,
                security or performance of the Service remains with you. Without
                limiting the foregoing, the Service is not designed or licensed
                for use in hazardous environments requiring fail-safe controls,
                including without limitation operation of nuclear facilities,
                aircraft navigation/communication systems, air traffic control,
                and life support or weapons systems.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Limitation of Liability</h4>
              <p className='mt-2 text-sm'>
                In no event shall Scribie Techologies be liable for any
                indirect, special, incidental, consequential or punitive damages
                (including but not limited to loss of effort, loss of time, loss
                of use, loss of profits, or loss of data) whether in an action
                in contract, tort (including but not limited to negligence),
                equity or otherwise, arising out of or in any way connected with
                the use of or inability to use this site or the materials
                therein or resulting from unauthorized access to or alteration
                of data.
              </p>
              <p className='mt-2 text-sm'>
                You acknowledge and agree that all decisions made by Scribie
                Technologies regarding the use of this site (including
                applications, submissions, disputes, requests etc.) are final
                and binding.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Termination of Service</h4>
              <p className='mt-2 text-sm'>
                We reserve the right to suspend your Scribie.ai account at any
                time.
              </p>
            </div>

            <div>
              <h4 className='text-xl font-semibold'>Conditions</h4>
              <p className='mt-2 text-sm'>
                We may modify or terminate our services at anytime, for any
                reason, and without notice. We reserve the right to modify these
                Terms of Service at any time without notice. Please review these
                Terms of Service on occasion as they may change in the future.
                We may, but have no obligation to, remove accounts and content
                containing what we determine as unlawful, offensive,
                threatening, defamatory, obscene or otherwise objectionable
                material. We will remove content that violates any party's
                intellectual property or these Terms of Service. An account
                terminated by Scribie Techologies will not be backed-up for any
                reason and will be immediately deleted from our servers.
              </p>
            </div>

            <div className='mt-6 text-sm'>
              Users with questions about this Agreement may contact Scribie
              Technologies by Email at{' '}
              <a href='mailto:contact@scribie.ai' className='underline'>
                contact@scribie.ai
              </a>
              .
            </div>
          </div>
        </div>
        <div className=''>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='name'>Initials</Label>
              <Input
                id='initials'
                type='text'
                className='w-full'
                placeholder='Enter your initials'
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
              />
            </div>
          </div>
        </div>
        {isLoading ? (
          <Button disabled className='w-full'>
            Please wait
            <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
          </Button>
        ) : (
          <Button
            onClick={handleAccept}
            disabled={!initials.trim() || isLoading}
            className='w-full'
          >
            Sign & Accept
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
