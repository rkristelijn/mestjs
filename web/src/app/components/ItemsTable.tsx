'use client';
import * as React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useItems } from '@/lib/hooks';
import type { Item } from '@/lib/api';

const col = createColumnHelper<Item>();
const columns = [
  col.accessor('id', { header: 'ID' }),
  col.accessor('name', { header: 'Name' }),
  col.accessor('price', {
    header: 'Price',
    cell: (info) => `€ ${Number(info.getValue()).toFixed(2)}`,
  }),
];

export function ItemsTable() {
  const { data, isLoading, error } = useItems();

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <CircularProgress />;
  if (error)
    return (
      <Alert severity="error">
        {error instanceof Error ? error.message : 'Request failed'}
      </Alert>
    );

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableCell key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
