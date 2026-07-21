import React from 'react';
import { Card, CardContent, Skeleton, Box, Stack } from '@mui/material';
import { motion } from 'framer-motion';

const cardVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function SkeletonCard() {
  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate">
      <Card sx={{ minHeight: 110, display: 'flex', alignItems: 'center' }}>
        <CardContent sx={{ width: '100%', py: 2, px: 3, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ width: '60%' }}>
              <Skeleton variant="text" width="80%" height={20} sx={{ borderRadius: 1 }} />
              <Skeleton variant="text" width="50%" height={40} sx={{ mt: 1, borderRadius: 1 }} />
            </Box>
            <Skeleton variant="circular" width={44} height={44} />
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function SkeletonChart() {
  return (
    <motion.div variants={cardVariants} initial="initial" animate="animate">
      <Card sx={{ height: 420, p: 3, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 3 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width="40%" height={24} sx={{ borderRadius: 1 }} />
        </Stack>
        
        <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, px: 1, pb: 2 }}>
          {[60, 40, 80, 50, 70, 90, 30, 85, 45, 65].map((height, idx) => (
            <Skeleton
              key={idx}
              variant="rectangular"
              width="10%"
              height={`${height}%`}
              sx={{ borderRadius: '4px 4px 0 0', flexGrow: 1 }}
            />
          ))}
        </Box>
      </Card>
    </motion.div>
  );
}

export default SkeletonCard;
