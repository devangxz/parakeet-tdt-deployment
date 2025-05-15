/* eslint-disable jsx-a11y/alt-text */
'use client'

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
  BlobProvider,
} from '@react-pdf/renderer'
import { Session } from 'next-auth'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

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
import { INVOICE_ADDRESS, INVOICE_DISCLAIMER } from '@/constants'
import formatDateTime from '@/utils/formatDateTime'

interface ConsolidatedInvoiceModalProps {
  open: boolean
  onClose: () => void
  selectedInvoiceIds: string[]
  session?: Session
}

interface Invoice {
  type: string
  id: string
  email: string
  date: string
  fileIds: string
  userId: string
}

interface InvoiceFile {
  filename: string
  delivery_date: string
  duration: number
  rate: number
  amount: number
  type?: string
}

interface InvoiceUser {
  name: string
  email: string
  address_1: string
  address_2: string
  phone: string
}

interface ReceiptInterface {
  services: string
  paidByName: string
  paidByEmail: string
  chargeAmount: number
  refundedAmount: number
  netAmount: number
  transactionId: string
  date: string
  invoiceType: string
  discount: number
  creditsUsed: number
  paymentMethod: string
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
  subtitle2: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  receiptContainer: {
    marginTop: 25,
  },
})

const ConsolidatedInvoicePDF = ({
  invoices,
  allFiles,
  invoiceUser,
  receipts,
  totalAmount,
}: {
  invoices: Invoice[]
  allFiles: InvoiceFile[]
  invoiceUser: InvoiceUser | null
  receipts: ReceiptInterface[]
  totalAmount: number
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Image src='/assets/images/scribie-invoice.png' />
      <View>
        <Text style={styles.header}>INVOICE</Text>
        <View style={styles.tableCustomer}>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>CUSTOMER ID</Text>
            <Text style={styles.customerTableCell}>{invoices[0]?.userId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Date</Text>
            <Text style={styles.customerTableCell}>
              {formatDateTime(new Date().toISOString())}
            </Text>
          </View>
          {/* <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Invoices</Text>
            <Text style={styles.customerTableCell}>
              {invoices.map((inv) => inv.id).join(', ')}
            </Text>
          </View> */}
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
                width: '250px',
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
              File Name
            </Text>
            <Text
              style={{
                width: '70px',
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
              Type
            </Text>
            <Text style={[styles.tableCellHeader, { paddingRight: 3 }]}>
              Minutes
            </Text>
            <Text style={[styles.tableCellHeader, { paddingRight: 3 }]}>
              Rate
            </Text>
            <Text style={[styles.tableCellHeader, { borderRightWidth: 1 }]}>
              Amount
            </Text>
          </View>
          {allFiles.map((file, index) => (
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
                  width: '250px',
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
              <Text
                style={{
                  width: '70px',
                  borderWidth: 1,
                  borderColor: '#000',
                  fontSize: 10,
                  padding: 2,
                  borderBottom: 'none',
                  borderRight: 'none',
                }}
              >
                {file.type || 'Transcript'}
              </Text>
              <Text style={[styles.tableCell, { paddingRight: 3 }]}>
                {file.type === 'ADD_CREDITS'
                  ? 'N/A'
                  : (Number(file.duration) / 60).toFixed(2)}
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
                {file.type === 'ADD_CREDITS'
                  ? 'N/A'
                  : `$${Number(file.rate).toFixed(2)}`}
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
                width: '473px',
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
              ${totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.fontStyle8}>{INVOICE_DISCLAIMER}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle2}>PAYMENT RECEIPTS</Text>
        {receipts.map((receipt, index) => (
          <View
            style={[styles.table2, index > 0 ? styles.receiptContainer : {}]}
            key={index}
          >
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.tableCellHeader,
                  {
                    textAlign: 'center',
                    fontSize: 12,
                    borderRightWidth: 1,
                    fontWeight: 'bold',
                  },
                ]}
              >
                PAYMENT RECEIPT
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { borderRight: 'none' }]}>
                Invoice ID
              </Text>
              <Text style={styles.tableCell}>{invoices[index]?.id}</Text>
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
        ))}
      </View>

      <View style={styles.section2}>
        <Text style={styles.fontStyle8}>{INVOICE_DISCLAIMER}</Text>
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

const ConsolidatedInvoiceModal = ({
  open,
  onClose,
  selectedInvoiceIds,
}: ConsolidatedInvoiceModalProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [allFiles, setAllFiles] = useState<InvoiceFile[]>([])
  const [receipts, setReceipts] = useState<ReceiptInterface[]>([])
  const [invoiceUser, setInvoiceUser] = useState<InvoiceUser | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)

  const fetchAllInvoiceDetails = async () => {
    if (!selectedInvoiceIds.length) return

    setIsLoading(true)
    try {
      const allInvoices: Invoice[] = []
      const allReceiptData: ReceiptInterface[] = []
      let allFilesData: InvoiceFile[] = []
      let total = 0

      // Process each selected invoice
      for (const invoiceId of selectedInvoiceIds) {
        const response = await getInvoiceDetails(invoiceId, null)

        if (!response.success || !response.responseData) {
          throw new Error(`Failed to fetch invoice details for ${invoiceId}`)
        }

        const { invoice } = response.responseData

        // Save the user info from the first invoice
        if (allInvoices.length === 0) {
          setInvoiceUser({
            name: `${invoice.user.firstname} ${invoice.user.lastname}`,
            email: invoice.user.email,
            address_1: invoice.user.address_1,
            address_2: invoice.user.address_2,
            phone: invoice.user.phone,
          })
        }

        // Create invoice object
        allInvoices.push({
          type: invoice.type,
          id: invoice.invoiceId,
          email: invoice.user.email,
          date: invoice.createdAt.toISOString(),
          fileIds: invoice.itemNumber ?? '',
          userId: invoice.userId.toString(),
        })

        // Calculate receipt total
        const invoiceTotal =
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

        total += invoiceTotal

        // Add receipt data
        allReceiptData.push({
          services: ``,
          paidByName: `${response.responseData.invoice.user.firstname} ${response.responseData.invoice.user.lastname}`,
          paidByEmail: response.responseData.invoice.user.email,
          chargeAmount: response.responseData.invoice.amount,
          refundedAmount: response.responseData.invoice.refundAmount,
          netAmount: invoiceTotal,
          transactionId: response.responseData.invoice.transactionId ?? '',
          date: response.responseData.invoice.createdAt.toISOString(),
          invoiceType: response.responseData.invoice.type,
          discount: response.responseData.invoice.discount,
          creditsUsed: response.responseData.invoice.creditsUsed,
          paymentMethod: response.responseData.invoice.paymentMethod,
        })

        // Process files for non-ADD_CREDITS invoices
        if (invoice.type !== 'ADD_CREDITS') {
          const invoiceoOptions = JSON.parse(
            response.responseData.invoice.options ?? '{}'
          )
          const isRushOrder = invoiceoOptions.exd === 1
          const isStrictVerbatim = invoiceoOptions.vb === 1

          const files = response.responseData.files?.map(
            (file: {
              price: number
              createdAt: { toISOString: () => string }
              File: {
                filename: string
                duration: number
              }
            }) => {
              let fileRate = 0

              if (response.responseData.invoice.type === 'ADDL_FORMATTING') {
                fileRate = response.responseData.customFormatRate
              } else {
                const baseRate = response.responseData.invoice.orderRate
                  ? response.responseData.invoice.orderRate
                  : file.price / (file.File.duration / 60)

                fileRate = isRushOrder
                  ? baseRate + response.responseData.rates.rush_order
                  : isStrictVerbatim
                  ? baseRate + response.responseData.rates.verbatim
                  : baseRate
              }

              const fileAmount = fileRate * (file.File.duration / 60)

              return {
                filename: file.File.filename,
                delivery_date: file.createdAt.toISOString(),
                duration: file.File.duration,
                rate: fileRate,
                amount: fileAmount,
                type: response.responseData.invoice.type,
              }
            }
          )

          allFilesData = [...allFilesData, ...(files || [])]
        } else {
          // Add a single row for ADD_CREDITS invoices
          allFilesData.push({
            filename: 'Invoice for adding account credits',
            delivery_date: invoice.createdAt.toISOString(),
            duration: 0,
            rate: 0,
            amount: Number(
              (
                response.responseData.invoice.amount -
                response.responseData.invoice.discount
              ).toFixed(2)
            ),
            type: 'ADD_CREDITS',
          })
        }
      }

      setInvoices(allInvoices)
      setAllFiles(allFilesData)
      setReceipts(allReceiptData)
      setTotalAmount(total)
    } catch (err) {
      toast.error('Failed to fetch invoice details')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && selectedInvoiceIds.length > 0) {
      fetchAllInvoiceDetails()
    }
  }, [open, selectedInvoiceIds])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[1150px]'>
        <DialogHeader>
          <DialogTitle>Consolidated Invoice</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className='flex items-center justify-center'>
            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            <p>Loading...</p>
          </div>
        ) : (
          <BlobProvider
            document={
              <ConsolidatedInvoicePDF
                invoices={invoices}
                allFiles={allFiles}
                invoiceUser={invoiceUser}
                receipts={receipts}
                totalAmount={totalAmount}
              />
            }
          >
            {({ url, loading, error }) => {
              if (loading || error) {
                return (
                  <div className='flex h-[500px] items-center justify-center'>
                    {loading ? (
                      <div className='flex flex-col items-center'>
                        <ReloadIcon className='h-8 w-8 animate-spin' />
                        <p className='mt-2'>Generating invoice preview...</p>
                      </div>
                    ) : (
                      <p className='text-destructive'>Error loading preview</p>
                    )}
                  </div>
                )
              }

              return (
                <div className='h-[600px] overflow-auto border rounded-md'>
                  <iframe
                    src={url || ''}
                    className='h-full w-full'
                    title='Invoice Preview'
                  />
                </div>
              )
            }}
          </BlobProvider>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button disabled={isLoading}>
              {isLoading ? (
                <>
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  Loading...
                </>
              ) : (
                <PDFDownloadLink
                  document={
                    <ConsolidatedInvoicePDF
                      invoices={invoices}
                      allFiles={allFiles}
                      invoiceUser={invoiceUser}
                      receipts={receipts}
                      totalAmount={totalAmount}
                    />
                  }
                  fileName={`consolidated-invoice-${
                    new Date().toISOString().split('T')[0]
                  }.pdf`}
                >
                  {({ loading }) =>
                    loading ? 'Preparing document...' : 'Download PDF'
                  }
                </PDFDownloadLink>
              )}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConsolidatedInvoiceModal
