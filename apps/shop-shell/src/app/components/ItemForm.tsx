'use client';
import * as React from 'react';
import { Box, Button, TextField, Alert } from '@mui/material';
import { useCreateItem } from '@/lib/hooks';

// Dynamic form: one field per key of the item shape. Adding a field to the
// shape adds an input automatically.
const fields: Array<{ key: 'name' | 'price'; label: string; type: string }> = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'price', label: 'Price', type: 'number' },
];

export function ItemForm() {
  const createItem = useCreateItem();
  const [values, setValues] = React.useState<Record<string, string>>({
    name: '',
    price: '',
  });

  const onChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItem.mutate(
      { name: values.name, price: Number(values.price) },
      { onSuccess: () => setValues({ name: '', price: '' }) }
    );
  };

  return (
    <Box component="form" onSubmit={onSubmit} sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        {fields.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            type={f.type}
            value={values[f.key]}
            onChange={onChange(f.key)}
            size="small"
            required
          />
        ))}
        <Button type="submit" variant="contained" disabled={createItem.isPending}>
          Add item
        </Button>
      </Box>
      {createItem.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {createItem.error instanceof Error
            ? createItem.error.message
            : 'Create failed'}
        </Alert>
      )}
    </Box>
  );
}
