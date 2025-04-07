/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/alt-text */
import { ReloadIcon } from '@radix-ui/react-icons'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
  Font,
} from '@react-pdf/renderer'
import { Session } from 'next-auth'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { AddCreditBillOptions } from './add-credits-bill-summary'
import { BillOptions } from './bill-summary'
import { Receipt } from './receipt'
import { Services } from './services'
import { ReceiptInterface, BillSummary, ServicesInterface } from './types'
import { getInvoiceDetails } from '@/app/actions/invoice/[invoiceId]'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { INVOICE_ADDRESS, INVOICE_DISCLAIMER } from '@/constants'
import formatDateTime from '@/utils/formatDateTime'

interface InvoicesDetailDialogProps {
  open: boolean
  onClose: () => void
  selectedInvoiceId: string
  session: Session
}

interface Invoice {
  type: string
  id: string
  email: string
  date: string
  fileIds: string
  userId: string
}

interface InvoiceUser {
  name: string
  email: string
  address_1: string
  address_2: string
  phone: string
}

const optionNames: Record<string, string> = {
  ts: 'Audio time coding',
  vb: 'Strict verbatim',
  sub: 'Subtitle file',
  exd: 'Rush hour',
  vts: 'BITC',
}

Font.register({
  family: 'Arial',
  src: 'https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf',
})

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Arial',
  },
  section: {
    marginBottom: 10,
  },
  header: {
    fontSize: 36,
    color: '#CCCCCC',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 40,
    textAlign: 'center',
    color: '#305d86',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  tableCustomer: {
    width: '50%',
    marginTop: 10,
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  table2: {
    width: '70%',
  },
  tableRow: {
    flexDirection: 'row',
  },
  table: {
    width: '100%',
  },
  tableCellHeader: {
    backgroundColor: '#305d86',
    color: 'white',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    padding: 2,
    borderBottom: 'none',
    borderRight: 'none',
  },
  tableCell: {
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
    padding: 2,
    borderBottom: 'none',
  },
  customerTableCell: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
    borderBottom: 'none',
  },
  customerTableCellMain: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#000',
    borderBottom: 'none',
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    borderRight: 'none',
    color: '#000',
  },
  footer: {
    fontSize: 10,
    textAlign: 'center',
  },
  address: {
    marginBottom: 10,
    fontSize: 10,
  },
  rightSection: {
    width: '100%',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  fontStyle10: {
    fontSize: 10,
  },
  addressLabel: {
    fontWeight: 600,
  },
  fontStyle8: {
    fontSize: 8,
  },
  section2: {
    marginBottom: 20,
  },
})

const InvoicePDF = ({
  invoice,
  billSummary,
  receipt,
  invoiceUser,
}: {
  invoice: Invoice | null
  billSummary: BillSummary | null
  receipt: ReceiptInterface | null
  invoiceUser: InvoiceUser | null
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Image src='/assets/images/scribie-invoice.png' />
      <View>
        <Text style={styles.header}>INVOICE</Text>
        <View style={styles.tableCustomer}>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>CUSTOMER ID</Text>
            <Text style={styles.customerTableCell}>{invoice?.userId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Date</Text>
            <Text style={styles.customerTableCell}>
              {formatDateTime(invoice?.date ?? '')}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Invoice</Text>
            <Text style={styles.customerTableCell}>{invoice?.id}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text
              style={[styles.customerTableCellMain, { borderBottomWidth: 1 }]}
            >
              EIN
            </Text>
            <Text style={[styles.customerTableCell, { borderBottomWidth: 1 }]}>
              99-5031138
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.address}>
          <Text style={styles.addressLabel}>FROM:</Text>
          <Text style={styles.fontStyle10}>Scribie Technologies Inc.,</Text>
          <Text>2261 Market Street, #22612,</Text>
          <Text>San Francisco, CA 94105, United States</Text>
          <Text>payments@scribie.com</Text>
        </View>
        <View style={styles.address}>
          <Text style={styles.addressLabel}>BILL TO:</Text>
          <Text>{invoiceUser?.email}</Text>
          <Text>{invoiceUser?.name}</Text>
          <Text>{invoiceUser?.address_1}</Text>
          <Text>{invoiceUser?.address_2}</Text>
          <Text>{invoiceUser?.phone}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text
              style={{
                width: '20px',
                backgroundColor: '#305d86',
                color: 'white',
                fontWeight: 'bold',
                borderWidth: 1,
                textAlign: 'center',
                fontSize: 10,
                borderBottom: 'none',
                borderRight: 'none',
              }}
            >
              #
            </Text>
            <Text
              style={{
                width: '350px',
                backgroundColor: '#305d86',
                color: 'white',
                fontWeight: 'bold',
                borderWidth: 1,
                textAlign: 'center',
                fontSize: 10,
                borderBottom: 'none',
                borderRight: 'none',
              }}
            >
              {invoice?.type === 'TRANSCRIPT' || invoice?.type === 'FORMATTING'
                ? 'File Name'
                : 'Description'}
            </Text>
            {(invoice?.type === 'TRANSCRIPT' ||
              invoice?.type === 'FORMATTING') && (
              <>
                <Text style={[styles.tableCellHeader, { paddingRight: 3 }]}>
                  Minutes
                </Text>
                <Text style={[styles.tableCellHeader, { paddingRight: 3 }]}>
                  Rate
                </Text>
              </>
            )}
            <Text style={[styles.tableCellHeader, { borderRightWidth: 1 }]}>
              Amount
            </Text>
          </View>
          {billSummary?.files.map((file, index) => (
            <View style={styles.tableRow} key={index}>
              <Text
                style={{
                  width: '20px',
                  borderWidth: 1,
                  borderColor: '#000',
                  fontSize: 10,
                  padding: 2,
                  borderBottom: 'none',
                  borderRight: 'none',
                }}
              >
                {index + 1}
              </Text>
              <Text
                style={{
                  width: '350px',
                  borderWidth: 1,
                  borderColor: '#000',
                  fontSize: 10,
                  padding: 2,
                  borderBottom: 'none',
                  borderRight: 'none',
                }}
              >
                {file.filename}
              </Text>
              <Text style={[styles.tableCell, { paddingRight: 3 }]}>
                {(Number(file.duration) / 60).toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    borderLeft: 'none',
                    borderRight: 'none',
                    paddingRight: 3,
                  },
                ]}
              >
                ${Number(file.rate).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                ${Number(file.amount).toFixed(2)}
              </Text>
            </View>
          ))}
          {invoice?.type === 'ADD_CREDITS' && (
            <>
              <View style={styles.tableRow}>
                <Text
                  style={{
                    width: '20px',
                    borderWidth: 1,
                    borderColor: '#000',
                    fontSize: 10,
                    padding: 2,
                    borderBottom: 'none',
                    borderRight: 'none',
                  }}
                >
                  1
                </Text>
                <Text
                  style={{
                    width: '350px',
                    borderWidth: 1,
                    borderColor: '#000',
                    fontSize: 10,
                    padding: 2,
                    borderBottom: 'none',
                    borderRight: 'none',
                  }}
                >
                  Invoice for adding account credits
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${receipt?.netAmount}
                </Text>
              </View>
            </>
          )}
          {(invoice?.type === 'TRANSCRIPT' ||
            invoice?.type === 'FORMATTING') && (
            <View style={styles.tableRow}>
              <Text
                style={{
                  textAlign: 'right',
                  width: '483px',
                  borderWidth: 1,
                  borderColor: '#000',
                  fontSize: 10,
                  padding: 2,
                  borderBottom: 'none',
                  borderRight: 'none',
                }}
              >
                Applied Discount
              </Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                ${receipt?.discount}
              </Text>
            </View>
          )}
          <View style={styles.tableRow}>
            <Text
              style={{
                textAlign: 'right',
                width: '483px',
                borderWidth: 1,
                borderColor: '#000',
                fontSize: 10,
                padding: 2,
                borderRight: 'none',
              }}
            >
              Total
            </Text>
            <Text
              style={[
                styles.tableCell,
                { textAlign: 'right', borderBottomWidth: 1 },
              ]}
            >
              $
              {invoice?.type === 'ADD_CREDITS'
                ? receipt?.netAmount
                : billSummary?.total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.section2}>
        <Text style={styles.fontStyle8}>{INVOICE_DISCLAIMER}</Text>
      </View>
      <View style={styles.section}>
        <View style={styles.table2}>
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.tableCellHeader,
                { textAlign: 'center', fontSize: 15, borderRightWidth: 1 },
              ]}
            >
              PAYMENT RECEIPT
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Payment Method
            </Text>
            <Text style={styles.tableCell}>{receipt?.paymentMethod}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Paid By
            </Text>
            <Text style={styles.tableCell}>
              {receipt?.paidByName} ({receipt?.paidByEmail})
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Transaction ID
            </Text>
            <Text style={styles.tableCell}>{receipt?.transactionId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Credits used
            </Text>
            <Text style={styles.tableCell}>${receipt?.creditsUsed}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Refund Amount
            </Text>
            <Text style={styles.tableCell}>${receipt?.refundedAmount}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { borderRight: 'none' }]}>
              Net Amount
            </Text>
            <Text style={styles.tableCell}>${receipt?.netAmount}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text
              style={[
                styles.tableCell,
                { borderBottomWidth: 1, borderRight: 'none' },
              ]}
            >
              Payment Date
            </Text>
            <Text style={[styles.tableCell, { borderBottomWidth: 1 }]}>
              {formatDateTime(receipt?.date ?? '')}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={{ borderBottom: '1px solid black', marginBottom: '10px' }}>
          Thank you for choosing Scribie.ai!
        </Text>
        <Text>{INVOICE_ADDRESS}</Text>
      </View>
    </Page>
  </Document>
)

const InvoicesDetailDialog = ({
  open,
  onClose,
  selectedInvoiceId,
}: InvoicesDetailDialogProps) => {
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(true)
  const [billSummary, setBillSummary] = useState<BillSummary | null>(null)
  const [receipt, setReceipt] = useState<ReceiptInterface | null>(null)
  const [services, setServices] = useState<ServicesInterface | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [invoiceType, setInvoiceType] = useState<string>('')
  const [invoiceUser, setInvoiceUser] = useState<InvoiceUser | null>(null)

  const fetchInvoiceDetails = async () => {
    setIsInvoiceLoading(true)
    try {
      const response = await getInvoiceDetails(selectedInvoiceId, null)

      if (!response.success || !response.responseData) {
        throw new Error('Failed to fetch invoice details')
      }

      const { invoice } = response.responseData

      setInvoiceType(invoice.type)
      setInvoice({
        type: invoice.type,
        id: invoice.invoiceId,
        email: invoice.user.email,
        date: invoice.createdAt.toISOString(),
        fileIds: invoice.itemNumber ?? '',
        userId: invoice.userId.toString(),
      })
      setInvoiceUser({
        name: `${invoice.user.firstname} ${invoice.user.lastname}`,
        email: invoice.user.email,
        address_1: invoice.user.address_1,
        address_2: invoice.user.address_2,
        phone: invoice.user.phone,
      })
      const total =
        Number(
          (
            response.responseData.invoice.amount -
            response.responseData.invoice.discount
          ).toFixed(2)
        ) -
        Number(
          (
            response.responseData.invoice.refundAmount +
            response.responseData.invoice.creditsRefunded
          ).toFixed(2)
        )

      setReceipt({
        services: ``,
        paidByName: `${response.responseData.invoice.user.firstname} ${response.responseData.invoice.user.lastname}`,
        paidByEmail: response.responseData.invoice.user.email,
        chargeAmount: response.responseData.invoice.amount,
        refundedAmount: response.responseData.invoice.refundAmount,
        netAmount: total,
        transactionId: response.responseData.invoice.transactionId ?? '',
        date: response.responseData.invoice.createdAt.toISOString(),
        invoiceType: response.responseData.invoice.type,
        discount: response.responseData.invoice.discount,
        creditsUsed: response.responseData.invoice.creditsUsed,
        paymentMethod: response.responseData.invoice.paymentMethod,
      })

      if (response.responseData.invoice.type !== 'ADD_CREDITS') {
        const invoiceoOptions = JSON.parse(
          response.responseData.invoice.options ?? '{}'
        )
        const isRushOrder = invoiceoOptions.exd === 1

        const files = response.responseData.files?.map((file: any) => {
          let fileRate = 0

          if (response.responseData.invoice.type === 'ADDL_FORMATTING') {
            fileRate = response.responseData.customFormatRate
          } else {
            const baseRate = file.price / (file.File.duration / 60)

            fileRate = isRushOrder
              ? baseRate + response.responseData.rates.rush_order
              : baseRate
          }

          const fileAmount = fileRate * (file.File.duration / 60)

          return {
            filename: file.File.filename,
            delivery_date: file.createdAt.toISOString(),
            duration: file.File.duration,
            rate: fileRate,
            amount: fileAmount,
          }
        })
        setBillSummary({ total, files: files as any })

        const options = JSON.parse(
          response.responseData.invoice.options ?? '{}'
        )
        const enabledOptions = Object.keys(options)
          .filter((key) => options[key] === 1 && optionNames[key] !== undefined)
          .map((key) => optionNames[key])
          .join(', ')

        const enabledCount = Object.keys(options).filter(
          (key) => options[key] === 1 && optionNames[key] !== undefined
        ).length

        setServices({
          orderOptions: enabledOptions,
          speakerNameFormat: options.si === 1 ? 'Initials' : 'Full Name',
          transcriptTemplate:
            response.responseData.templates?.find(
              (template: { id: number }) => template.id === Number(options.tmp)
            )?.name || 'Unknown',
          spellingStyle: options.sp,
          specialInstructions: response.responseData.invoice.instructions ?? '',
        })
        setReceipt({
          services: `${enabledCount} (${enabledOptions})`,
          paidByName: `${response.responseData.invoice.user.firstname} ${response.responseData.invoice.user.lastname}`,
          paidByEmail: response.responseData.invoice.user.email,
          chargeAmount: response.responseData.invoice.amount,
          refundedAmount:
            response.responseData.invoice.refundAmount +
            response.responseData.invoice.creditsRefunded,
          netAmount: total,
          transactionId: response.responseData.invoice.transactionId ?? '',
          date: response.responseData.invoice.createdAt.toISOString(),
          invoiceType: response.responseData.invoice.type,
          discount: response.responseData.invoice.discount,
          creditsUsed: response.responseData.invoice.creditsUsed,
          paymentMethod: response.responseData.invoice.paymentMethod,
        })
      }
    } catch (err) {
      toast.error('Failed to fetch invoice details')
    } finally {
      setIsInvoiceLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchInvoiceDetails()
    }
  }, [open])

  const handleCheckStatus = () => {
    window.open(`/files/permalink/${invoice?.fileIds}`, '_blank')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {isInvoiceLoading ? (
            <div className='flex items-center justify-center'>
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              <p>Loading...</p>
            </div>
          ) : (
            <>
              <div className='flex w-full items-center justify-between just gap-5 mt-2 text-md font-medium'>
                <div>
                  {invoice?.type} <br />
                  <span className='text-sm font-normal'>{invoice?.id}</span>
                </div>
                <div className='text-center'>
                  Bill To <br />
                  <span className='text-sm font-normal'>{invoice?.email}</span>
                </div>
                <div>
                  Date <br />
                  <span className='text-sm font-normal'>
                    {formatDateTime(invoice?.date ?? '')}
                  </span>
                </div>
              </div>
              <Separator />
              {invoiceType !== 'ADD_CREDITS' ? (
                <>
                  {billSummary && billSummary.files.length > 0 && (
                    <>
                      <BillOptions billSummary={billSummary!} />
                      <Separator />
                    </>
                  )}

                  <Services
                    services={services!}
                    invoiceId={selectedInvoiceId}
                  />
                  <Separator />
                  <Receipt receipt={receipt!} />
                </>
              ) : (
                <>
                  <AddCreditBillOptions
                    total={receipt?.netAmount as number}
                    amount={receipt?.netAmount as number}
                  />
                  <Separator />
                  <Receipt receipt={receipt!} />
                </>
              )}
            </>
          )}
          <DialogFooter>
            {/* Hide it for now*/}
            {/* <Button variant='order'>Print</Button> */}
            {(invoiceType === 'TRANSCRIPT' ||
              invoiceType === 'FORMATTING' ||
              invoiceType === 'ADD_CREDITS') && (
              <>
                <Button variant='order' onClick={handleCheckStatus}>
                  Check Status
                </Button>
                <DialogClose asChild>
                  <Button>
                    <PDFDownloadLink
                      document={
                        <InvoicePDF
                          invoice={invoice}
                          billSummary={billSummary}
                          receipt={receipt}
                          invoiceUser={invoiceUser}
                        />
                      }
                      fileName={`${selectedInvoiceId}.pdf`}
                    >
                      {({ loading }) =>
                        loading ? 'Loading...' : 'Download PDF'
                      }
                    </PDFDownloadLink>
                  </Button>
                </DialogClose>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default InvoicesDetailDialog
