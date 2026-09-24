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
  Edit as EditIcon,
  DeleteOutlined as DeleteIcon,
} from '@mui/icons-material';

export default function ModuleActionsMenu({
  moduleLabel,
  taskCount,
  isStandalone = false,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  if ((!canEdit && !canDelete) || (!onEdit && !onDelete)) return null;

  const deleteLabel = isStandalone ? 'Delete Standalone Tasks' : 'Delete Module';
  const editLabel = isStandalone ? 'Convert to Module' : 'Edit Module';

  return (
    <>
      <IconButton
        size="small"
        className="row-actions"
        aria-label={`Actions for ${moduleLabel}`}
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
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              minWidth: 220,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
            },
          },
        }}
      >
        {canEdit && onEdit ? (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onEdit();
            }}
            sx={{ fontSize: '0.8125rem', py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={editLabel}
              primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
            />
          </MenuItem>
        ) : null}
        {canDelete && onDelete ? (
          <>
            {canEdit && onEdit ? <Divider sx={{ my: 0.5 }} /> : null}
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                onDelete();
              }}
              sx={{ fontSize: '0.8125rem', py: 1, color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'error.main', minWidth: 36 }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={deleteLabel}
                secondary={
                  taskCount != null
                    ? `${taskCount} task${taskCount === 1 ? '' : 's'}`
                    : undefined
                }
                primaryTypographyProps={{ fontWeight: 600, fontSize: '0.8125rem' }}
                secondaryTypographyProps={{ fontSize: '0.7rem' }}
              />
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  );
}
