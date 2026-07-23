import React, { useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  PersonAdd as AssignIcon,
  SwapHoriz as StatusIcon,
  ContentCopy as DuplicateIcon,
  DeleteOutlined as DeleteIcon,
} from '@mui/icons-material';

export default function TaskActionsMenu({
  task,
  canEdit,
  canAssign,
  canStatus,
  onView,
  onEdit,
  onAssign,
  onMoveStatus,
  onDuplicate,
  onDelete,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const close = () => setAnchorEl(null);

  const items = [
    {
      key: 'view',
      label: 'View',
      icon: <ViewIcon fontSize="small" />,
      onClick: () => onView?.(task),
      show: true,
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: () => onEdit?.(task),
      show: canEdit,
    },
    {
      key: 'assign',
      label: 'Assign Developer',
      icon: <AssignIcon fontSize="small" />,
      onClick: () => onAssign?.(task),
      show: canAssign,
    },
    {
      key: 'status',
      label: 'Move Status',
      icon: <StatusIcon fontSize="small" />,
      onClick: () => onMoveStatus?.(task),
      show: canStatus,
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      icon: <DuplicateIcon fontSize="small" />,
      onClick: () => onDuplicate?.(task),
      show: canEdit && Boolean(onDuplicate),
      dividerBefore: true,
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: () => onDelete?.(task),
      show: canEdit && Boolean(onDelete),
      danger: true,
    },
  ].filter((i) => i.show);

  return (
    <>
      <IconButton
        size="small"
        className="row-actions"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        sx={{
          opacity: { xs: 1, md: 0.35 },
          transition: 'opacity 0.15s ease, background 0.15s ease',
          '&:hover': { opacity: 1, bgcolor: 'action.hover' },
        }}
      >
        <MoreIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              minWidth: 200,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
            },
          },
        }}
      >
        {items.map((item) => (
          <React.Fragment key={item.key}>
            {item.dividerBefore && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              onClick={() => {
                close();
                item.onClick?.();
              }}
              sx={{
                fontSize: '0.8125rem',
                py: 1,
                color: item.danger ? 'error.main' : 'text.primary',
              }}
            >
              <ListItemIcon
                sx={{
                  color: item.danger ? 'error.main' : 'text.secondary',
                  minWidth: 36,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
              />
            </MenuItem>
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
}
