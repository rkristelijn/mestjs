'use client';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Typography } from '@mui/material';
import { ItemForm } from '../../components/ItemForm';
import { ItemsTable } from '../../components/ItemsTable';
import { ItemBanner } from '../../components/ItemBanner';
import { useItems } from '@/lib/hooks';

export default function ItemsPage() {
  const { data } = useItems();
  const last = data?.[data.length - 1];

  return (
    <PageContainer>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Read from and written to the NestJS API (SQLite, raw SQL).
      </Typography>
      {last && <ItemBanner item={last} />}
      <ItemForm />
      <ItemsTable />
    </PageContainer>
  );
}
