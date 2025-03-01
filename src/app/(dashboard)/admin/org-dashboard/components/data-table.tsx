'use client'

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'

import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onSelectedRowsChange?: (selectedRows: TData[]) => void
  renderRowSubComponent?: (props: { row: unknown }) => React.ReactNode
  renderWaveform?: (row: TData) => React.ReactNode
}

const isDeliveryDatePast = (deliveryTs: string) =>
  new Date(deliveryTs) < new Date()

export function DataTable<TData, TValue>({
  columns,
  data,
  onSelectedRowsChange,
  renderRowSubComponent,
  renderWaveform,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      orgName: false,
      customerWatch: false,
      transcriberWatch: false,
    })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  React.useEffect(() => {
    if (table.getSelectedRowModel().rows.length > 0 && onSelectedRowsChange) {
      const selectedRowsData = table
        .getSelectedRowModel()
        .rows.map((row) => row.original)
      onSelectedRowsChange(selectedRowsData)
    } else {
      onSelectedRowsChange?.([])
    }
  }, [rowSelection])

  return (
    <div className='space-y-4'>
      <DataTableToolbar table={table} />
      <div className='rounded-md border-2 border-customBorder bg-background'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  {renderWaveform && (
                    <TableRow className='border-b-0'>
                      <TableCell colSpan={columns.length} className='py-2'>
                        {renderWaveform(row.original)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow
                    data-state={row.getIsSelected() && 'selected'}
                    className={`${
                      isDeliveryDatePast(row.getValue('deliveryTs'))
                        ? 'bg-red-200 dark:bg-red-800'
                        : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderRowSubComponent && row.original && (
                    <>
                      {(() => {
                        const subComponent = renderRowSubComponent({ row })
                        return subComponent ? (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              className='p-0 px-3 pb-4'
                            >
                              {subComponent}
                            </TableCell>
                          </TableRow>
                        ) : null
                      })()}
                    </>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
