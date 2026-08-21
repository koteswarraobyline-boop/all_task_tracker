import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import {
  DELIVERY_STATUS_COLORS,
  deliveryStatusLabel,
} from '../../utils/deliveryHealth';

export default function ProjectHealthBadge({ status, size = 'small', sx = {} }) {
  const colors = DELIVERY_STATUS_COLORS[status] || DELIVERY_STATUS_COLORS.ON_TRACK;
  const label = deliveryStatusLabel(status);

  return (
    <Tooltip title={`Delivery status: ${label}`} arrow>
      <Chip
        size={size}
        label={label.toUpperCase()}
        sx={{
          height: size === 'small' ? 24 : 28,
          fontWeight: 800,
          fontSize: size === 'small' ? '0.65rem' : '0.7rem',
          letterSpacing: '0.04em',
          bgcolor: colors.bg,
          color: colors.color,
          border: `1px solid ${colors.border}`,
          ...sx,
        }}
      />
    </Tooltip>
  );
}
