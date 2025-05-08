'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
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
  showToolbar?: boolean
  isLoading?: boolean
  pagination?: {
    currentPage: number
    pageCount: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSelectedRowsChange,
  renderRowSubComponent,
  showToolbar = false,
  isLoading = false,
  pagination,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      orgName: false,
      diff: false,
      isCustomFormat: false,
    })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [localPagination, setLocalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const isManualPagination = !!pagination

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: isManualPagination
        ? {
            pageIndex: pagination?.currentPage ? pagination.currentPage - 1 : 0,
            pageSize: pagination?.pageSize || 10,
          }
        : localPagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: isManualPagination ? undefined : setLocalPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: isManualPagination,
    pageCount: isManualPagination ? pagination.pageCount : undefined,
  })

  // Set current page from external pagination state
  React.useEffect(() => {
    if (
      pagination &&
      table.getState().pagination.pageIndex !== pagination.currentPage - 1
    ) {
      table.setPageIndex(pagination.currentPage - 1)
    }
  }, [pagination, table])

  // Set page size from external pagination state
  React.useEffect(() => {
    if (
      pagination &&
      table.getState().pagination.pageSize !== pagination.pageSize
    ) {
      table.setPageSize(pagination.pageSize)
    }
  }, [pagination, table])

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
      {showToolbar && <DataTableToolbar table={table} />}
      <div className='rounded-md border-2 border-customBorder bg-background'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className='h-fit p-4 text-left align-middle font-medium text-[15px]'
                  >
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-24 text-center'
                >
                  <div className='flex justify-center items-center'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    <p>Loading...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='px-4 py-3'>
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
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        onPageChange={isManualPagination ? pagination.onPageChange : undefined}
        onPageSizeChange={
          isManualPagination ? pagination.onPageSizeChange : undefined
        }
      />
    </div>
  )
}
