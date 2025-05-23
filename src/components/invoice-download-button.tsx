/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from '@react-pdf/renderer'
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getInvoiceDetails } from '@/app/actions/invoice/[invoiceId]'
import { Button } from '@/components/ui/button'
import { INVOICE_ADDRESS, INVOICE_DISCLAIMER } from '@/constants'
import formatDateTime from '@/utils/formatDateTime'

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
  tableCustomer: {
    width: '50%',
    marginTop: 10,
    marginBottom: 20,
    alignSelf: 'flex-end',
  },
  table: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
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
  customerTableCell: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#000',
    flex: 1,
    fontSize: 10,
    borderBottom: 'none',
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
  fontStyle10: {
    fontSize: 10,
  },
  fontStyle8: {
    fontSize: 8,
  },
  address: {
    marginBottom: 10,
    fontSize: 10,
  },
  addressLabel: {
    fontWeight: 600,
  },
  footer: {
    fontSize: 10,
    textAlign: 'center',
  },
  section2: {
    marginBottom: 20,
  },
})

interface FileItem {
  name: string
  amount: number
  duration: number
  fileId: string
}

interface UserData {
  userId: string
  email: string
  name: string
  address_1?: string
  address_2?: string
  phone?: string
}

interface InvoiceData {
  id: string
  amount: number
  date: string
  type: string
  files?: FileItem[]
}

const InvoicePDF = ({
  invoice,
  user,
}: {
  invoice: InvoiceData
  user: UserData
}) => (
  <Document>
    <Page size='A4' style={styles.page}>
      <Image src='/assets/images/scribie-invoice.png' />
      <View>
        <Text style={styles.header}>INVOICE</Text>
        <View style={styles.tableCustomer}>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>CUSTOMER ID</Text>
            <Text style={styles.customerTableCell}>{user.userId}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Date</Text>
            <Text style={styles.customerTableCell}>
              {formatDateTime(invoice.date ?? '')}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.customerTableCellMain}>Invoice</Text>
            <Text style={styles.customerTableCell}>{invoice.id}</Text>
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
          <Text>{user.email}</Text>
          <Text>{user.name}</Text>
          <Text>{user.address_1 || ''}</Text>
          <Text>{user.address_2 || ''}</Text>
          <Text>{user.phone || ''}</Text>
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
              {invoice.type === 'ADD_CREDITS' ? 'Description' : 'File Name'}
            </Text>
            {invoice.type !== 'ADD_CREDITS' && (
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
          {invoice.type === 'ADD_CREDITS' ? (
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
                ${invoice.amount}
              </Text>
            </View>
          ) : (
            invoice.files?.map((file, index) => (
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
                  {file.name}
                </Text>
                <Text style={[styles.tableCell, { paddingRight: 3 }]}>
                  {(file.duration / 60).toFixed(2)}
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
                  ${(file.amount / (file.duration / 60)).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                  ${file.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
          <View style={styles.tableRow}>
            <Text
              style={{
                textAlign: 'right',
                width: invoice.type === 'ADD_CREDITS' ? '370px' : '483px',
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
              {typeof invoice.amount === 'number'
                ? invoice.amount.toFixed(2)
                : invoice.amount}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.section2}>
        <Text style={styles.fontStyle8}>{INVOICE_DISCLAIMER}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={{ borderBottom: '1px solid black', marginBottom: '10px' }}>
          Thank you for choosing Scribie!
        </Text>
        <Text>{INVOICE_ADDRESS}</Text>
      </View>
    </Page>
  </Document>
)

interface InvoiceDownloadButtonProps {
  invoiceId: string
  variant?:
    | 'default'
    | 'link'
    | 'outline'
    | 'destructive'
    | 'secondary'
    | 'order'
    | 'ghost'
  className?: string
  buttonText?: string
  showIcon?: boolean
  orderType?: string | null
  showPrimaryColor?: boolean
}

export default function InvoiceDownloadButton({
  invoiceId,
  variant = 'link',
  className = '',
  buttonText = 'Download PDF',
  showIcon = true,
  orderType = null,
  showPrimaryColor = false,
}: InvoiceDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails()
    }
  }, [invoiceId])

  const fetchInvoiceDetails = async () => {
    setIsLoading(true)
    try {
      const response = await getInvoiceDetails(invoiceId, orderType)

      if (!response.success || !response.responseData) {
        throw new Error('Failed to fetch invoice details')
      }

      const { invoice } = response.responseData

      // Prepare file data if available
      const files: FileItem[] = []
      if (invoice.type !== 'ADD_CREDITS' && response.responseData.files) {
        response.responseData.files.forEach((file: any) => {
          files.push({
            name: file.File.filename,
            amount: file.price,
            duration: file.File.duration,
            fileId: file.File.fileId,
          })
        })
      }

      // Set invoice data
      setInvoiceData({
        id: invoice.invoiceId,
        amount: invoice.amount,
        date: invoice.createdAt.toISOString(),
        type: invoice.type,
        files: files.length > 0 ? files : undefined,
      })

      // Set user data
      setUserData({
        userId: invoice.userId.toString(),
        email: invoice.user.email,
        name: `${invoice.user.firstname} ${invoice.user.lastname}`,
        address_1: invoice.user.address_1,
        address_2: invoice.user.address_2,
        phone: invoice.user.phone,
      })
    } catch (err) {
      toast.error('Failed to fetch invoice details')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant={variant} className={className} disabled>
        <ReloadIcon className='h-4 w-4 mr-2 animate-spin' />
        Loading...
      </Button>
    )
  }

  if (!invoiceData || !userData) {
    return (
      <Button
        variant={variant}
        className={className}
        onClick={fetchInvoiceDetails}
      >
        {buttonText}
      </Button>
    )
  }

  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoiceData} user={userData} />}
      fileName={`invoice-${invoiceId}.pdf`}
      className={className}
    >
      {({ loading }) => (
        <Button
          variant={variant}
          disabled={loading}
          className={`${showPrimaryColor ? 'border-2 text-primary' : ''}`}
        >
          {loading ? (
            <>
              <ReloadIcon className='h-4 w-4 mr-2 animate-spin' />
              Preparing...
            </>
          ) : (
            <>
              {showIcon && <Download className='h-4 w-4 mr-2' />}
              {buttonText}
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
