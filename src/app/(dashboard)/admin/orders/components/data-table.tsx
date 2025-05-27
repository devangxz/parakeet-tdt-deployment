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
  renderWaveform?: (row: TData) => React.ReactNode
  defaultColumnVisibility?: VisibilityState
  isLoading?: boolean
  pagination?: {
    currentPage: number
    pageCount: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  initialFilters?: Record<string, string | string[] | [string, string] | { singleDate?: [string, string]; dateRange?: [string, string] }>
  onFiltersChange?: (filters: Record<string, string | string[] | [string, string] | { singleDate?: [string, string]; dateRange?: [string, string] }>) => void
  activeTab?: string
}

const isDeliveryDatePast = (deliveryTs: string) =>
  new Date(deliveryTs) < new Date()

export function DataTable<TData, TValue>({
  columns,
  data,
  onSelectedRowsChange,
  renderRowSubComponent,
  renderWaveform,
  defaultColumnVisibility,
  isLoading = false,
  pagination,
  initialFilters,
  onFiltersChange,
  activeTab,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(
      defaultColumnVisibility ?? {
        orgName: false,
        customerWatch: false,
        transcriberWatch: false,
      }
    )
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])

  React.useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      const filtersToApply: ColumnFiltersState = Object.entries(initialFilters).map(
        ([id, value]) => ({
          id,
          value,
        })
      );
      setColumnFilters(filtersToApply);
    }
  }, [initialFilters]);

  const handleColumnFiltersChange = React.useCallback(
    (updaterOrValue: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters((prevFilters) => {
        const newFilters = typeof updaterOrValue === 'function' 
          ? updaterOrValue(prevFilters) 
          : updaterOrValue;
        
        if (onFiltersChange) {
          const filterObject = newFilters.reduce<Record<string, string | string[] | [string, string] | { singleDate?: [string, string]; dateRange?: [string, string] }>>(
            (acc, filter) => {
              acc[filter.id] = filter.value as string | string[] | [string, string] | { singleDate?: [string, string]; dateRange?: [string, string] };
              return acc;
            },
            {}
          );
          onFiltersChange(filterObject);
        }
        
        return newFilters;
      });
    },
    [onFiltersChange]
  );

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
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !!pagination,
    pageCount:
      pagination?.pageCount ||
      Math.ceil(data.length / (pagination?.pageSize || 10)),
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
    } else if (!pagination) {
      // Default page size for client-side pagination
      table.setPageSize(10)
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
  }, [rowSelection, onSelectedRowsChange, table])

  // Handler for client-side pagination
  const handleClientPageChange = (page: number) => {
    table.setPageIndex(page - 1)
    pagination?.onPageChange?.(page)
  }

  // Handler for client-side page size change
  const handleClientPageSizeChange = (pageSize: number) => {
    table.setPageSize(pageSize)
    pagination?.onPageSizeChange?.(pageSize)
  }

  return (
    <div className='space-y-4'>
      <DataTableToolbar table={table} activeTab={activeTab} />
      <div className='mt-4'>
        <DataTablePagination
          table={table}
          onPageChange={pagination?.onPageChange || handleClientPageChange}
          onPageSizeChange={
            pagination?.onPageSizeChange || handleClientPageSizeChange
          }
        />
      </div>

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
                      row.getValue('type') === 'RUSH'
                        ? 'bg-yellow-200 dark:bg-yellow-800'
                        : isDeliveryDatePast(row.getValue('deliveryTs'))
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
      <DataTablePagination
        table={table}
        onPageChange={pagination?.onPageChange || handleClientPageChange}
        onPageSizeChange={
          pagination?.onPageSizeChange || handleClientPageSizeChange
        }
      />
    </div>
  )
}
