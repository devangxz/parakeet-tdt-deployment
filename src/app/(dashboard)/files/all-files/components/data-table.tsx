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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calculateDifferenceInHours } from '@/utils/time-difference'
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onSelectedRowsChange?: (selectedRows: TData[]) => void
  onFileDrop?: (fileId: string, folderId: number) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onSelectedRowsChange,
  onFileDrop,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [draggedOverFolderId, setDraggedOverFolderId] = React.useState<number | null>(null)

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId)
    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLDivElement
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      padding: 4px 8px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      height: 55px;
      display: flex;
      align-items: center;
    `
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 0, 0)
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, folderId: number) => {
    e.preventDefault()
    setDraggedOverFolderId(folderId)
  }

  const handleDragLeave = () => {
    setDraggedOverFolderId(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, folderId: number) => {
    e.preventDefault()
    const fileId = e.dataTransfer.getData('text/plain')
    setDraggedOverFolderId(null)
    onFileDrop?.(fileId, folderId)
  }

  return (
    <div className='space-y-4'>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowData = row.original as { id: string; parentId?: string; date?: string }
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={`
                      ${rowData.date && calculateDifferenceInHours(new Date(row.getValue('date') as string)) <= 1 && 'bg-[#FFFBEB]'}
                      ${draggedOverFolderId === Number(rowData.id) ? 'bg-blue-50' : ''}
                    `}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell className='px-4 py-3' key={cell.id}>
                        {cell.column.id === 'name' ? (
                          <div>
                            {'parentId' in rowData ? (
                              <div
                                onDragOver={(e) => handleDragOver(e, Number(rowData.id))}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, Number(rowData.id))}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : (
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, rowData.id)}
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            )}
                          </div>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
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
      <DataTablePagination table={table} />
    </div>
  )
}
