'use client';
import { PageContainer } from '@toolpad/core/PageContainer';
import { Box, Typography } from '@mui/material';

export default function DashboardPage() {
  return (
    <PageContainer>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Nothing to see here yet
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          mestjs is a deliberately bad app. Use the Items page.
        </Typography>
      </Box>
    </PageContainer>
  );
}
