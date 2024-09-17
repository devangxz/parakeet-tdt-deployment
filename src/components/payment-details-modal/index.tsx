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
import { BACKEND_URL, INVOICE_ADDRESS, INVOICE_DISCLAIMER } from '@/constants'
import axiosInstance from '@/utils/axios'
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
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
  tableCell: {
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
    padding: 2,
  },
  customerTableCell: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
  },
  customerTableCellMain: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
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
      <Image src='https://scribie.com/assets/img/scribie-invoice.png' />
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
            <Text style={styles.customerTableCellMain}>EIN</Text>
            <Text style={styles.customerTableCell}>33-1218751</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.address}>
          <Text style={styles.addressLabel}>FROM:</Text>
          <Text style={styles.fontStyle10}>CGBiz Corporation,</Text>
          <Text>44 Tehama St.,</Text>
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
              }}
            >
              File Name
            </Text>
            <Text style={styles.tableCellHeader}>Minutes</Text>
            <Text style={styles.tableCellHeader}>Rate</Text>
            <Text style={styles.tableCellHeader}>Amount</Text>
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
                }}
              >
                {file.filename}
              </Text>
              <Text style={styles.tableCell}>
                {(Number(file.duration) / 60).toFixed(2)}
              </Text>
              <Text style={styles.tableCell}>
                ${Number(file.rate).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                ${Number(file.amount).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text
              style={{
                textAlign: 'right',
                width: '483px',
                borderWidth: 1,
                borderColor: '#000',
                fontSize: 10,
                padding: 2,
              }}
            >
              Applied Discount
            </Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              ${receipt?.discount}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text
              style={{
                textAlign: 'right',
                width: '483px',
                borderWidth: 1,
                borderColor: '#000',
                fontSize: 10,
                padding: 2,
              }}
            >
              Total
            </Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              ${billSummary?.total.toFixed(2)}
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
                { textAlign: 'center', fontSize: 15 },
              ]}
            >
              PAYMENT RECEIPT
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Payment Method</Text>
            <Text style={styles.tableCell}>{receipt?.paymentMethod}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Paid By</Text>
            <Text style={styles.tableCell}>
              {receipt?.paidByName} ({receipt?.paidByEmail})
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Transaction ID</Text>
            <Text style={styles.tableCell}>{receipt?.transactionId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Credits used</Text>
            <Text style={styles.tableCell}>${receipt?.creditsUsed}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Refund Amount</Text>
            <Text style={styles.tableCell}>${receipt?.refundedAmount}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Net Amount</Text>
            <Text style={styles.tableCell}>${receipt?.netAmount}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Payment Date</Text>
            <Text style={styles.tableCell}>
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
      const response = await axiosInstance.get(
        `${BACKEND_URL}/invoice/${selectedInvoiceId}`
      )
      setInvoiceType(response.data.invoice.type)
      setInvoice({
        type: response.data.invoice.type,
        id: response.data.invoice.invoiceId,
        email: response.data.invoice.user.email,
        date: response.data.invoice.createdAt,
        fileIds: response.data.invoice.itemNumber,
        userId: response.data.invoice.userId,
      })
      setInvoiceUser({
        name: `${response.data.invoice.user.firstname} ${response.data.invoice.user.lastname}`,
        email: response.data.invoice.user.email,
        address_1: response.data.invoice.user.address_1,
        address_2: response.data.invoice.user.address_2,
        phone: response.data.invoice.user.phone,
      })
      const total =
        Number(
          (
            response.data.invoice.amount - response.data.invoice.discount
          ).toFixed(2)
        ) -
        Number(
          (
            response.data.invoice.refundAmount +
            response.data.invoice.creditsRefunded
          ).toFixed(2)
        )

      setReceipt({
        services: ``,
        paidByName: `${response.data.invoice.user.firstname} ${response.data.invoice.user.lastname}`,
        paidByEmail: response.data.paidByUser
          ? response.data.paidByUser.email
          : '',
        chargeAmount: response.data.invoice.amount,
        refundedAmount: response.data.invoice.refundAmount,
        netAmount: total,
        transactionId: response.data.invoice.transactionId,
        date: response.data.invoice.createdAt,
        invoiceType: response.data.invoice.type,
        discount: response.data.invoice.discount,
        creditsUsed: response.data.invoice.creditsUsed,
        paymentMethod: response.data.invoice.paymentMethod,
      })

      if (response.data.invoice.type !== 'ADD_CREDITS') {
        const files = response.data?.files.map(
          (file: {
            File: {
              filename: string
              duration: number
            }
            createdAt: string
            price: number
          }) => ({
            filename: file.File.filename,
            delivery_date: file.createdAt,
            duration: file.File.duration,
            rate: file.price / (file.File.duration / 60),
            amount: file.price,
          })
        )
        setBillSummary({ total, files })

        const options = JSON.parse(response.data.invoice.options)
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
            response.data.templates.find(
              (template: { id: string }) => template.id === options.tmp
            )?.name || 'Unknown',
          spellingStyle: options.sp,
          specialInstructions: response.data.invoice.instructions,
        })
        setReceipt({
          services: `${enabledCount} (${enabledOptions})`,
          paidByName: `${response.data.invoice.user.firstname} ${response.data.invoice.user.lastname}`,
          paidByEmail: response.data.paidByUser
            ? response.data.paidByUser.email
            : '',
          chargeAmount: response.data.invoice.amount,
          refundedAmount:
            response.data.invoice.refundAmount +
            response.data.invoice.creditsRefunded,
          netAmount: total,
          transactionId: response.data.invoice.transactionId,
          date: response.data.invoice.createdAt,
          invoiceType: response.data.invoice.type,
          discount: response.data.invoice.discount,
          creditsUsed: response.data.invoice.creditsUsed,
          paymentMethod: response.data.invoice.paymentMethod,
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
    window.open(`/files/all-files?ids=${invoice?.fileIds}`, '_blank')
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>Invoice for</DialogTitle>
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

                  <Services services={services!} />
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
            {invoiceType === 'TRANSCRIPT' && (
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
                        loading ? 'Loading document...' : 'Download PDF'
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
