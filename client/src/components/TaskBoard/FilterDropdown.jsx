import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

/**
 * Rounded filter dropdown — single or multi-select with optional search.
 * options: [{ value, label, icon? }]
 */
export default function FilterDropdown({
  label,
  icon,
  options = [],
  value,
  onChange,
  multiple = false,
  searchable = false,
  searchPlaceholder = 'Search…',
  allLabel = 'Select All',
  minWidth = 140,
  maxHeight = 320,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [query, setQuery] = useState('');
  const open = Boolean(anchorEl);

  const selectedValues = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : [];
    return value == null || value === '' ? [] : [value];
  }, [value, multiple]);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const allSelected =
    multiple && options.length > 0 && selectedValues.length === options.length;

  const triggerLabel = useMemo(() => {
    if (selectedValues.length === 0) return label;
    if (!multiple) {
      const found = options.find((o) => o.value === selectedValues[0]);
      return found?.label || label;
    }
    if (selectedValues.length === 1) {
      const found = options.find((o) => o.value === selectedValues[0]);
      return found?.label || `${label} (1)`;
    }
    if (allSelected) return `${label}: All`;
    return `${label} (${selectedValues.length})`;
  }, [selectedValues, options, label, multiple, allSelected]);

  const hasValue = selectedValues.length > 0;

  const handleToggle = (optValue) => {
    if (!multiple) {
      onChange(optValue === value ? '' : optValue);
      setAnchorEl(null);
      return;
    }
    const next = selectedValues.includes(optValue)
      ? selectedValues.filter((v) => v !== optValue)
      : [...selectedValues, optValue];
    onChange(next);
  };

  const handleSelectAll = () => {
    if (!multiple) return;
    onChange(allSelected ? [] : options.map((o) => o.value));
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(multiple ? [] : '');
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={(e) => setAnchorEl(anchorEl ? null : e.currentTarget)}
        startIcon={icon || null}
        endIcon={
          hasValue ? (
            <ClearIcon
              sx={{ fontSize: 14, opacity: 0.7, '&:hover': { opacity: 1 } }}
              onClick={handleClear}
            />
          ) : (
            <ArrowDownIcon sx={{ fontSize: 18, opacity: 0.6 }} />
          )
        }
        sx={{
          minWidth,
          height: 36,
          minHeight: 36,
          maxHeight: 36,
          px: 1.25,
          py: 0,
          borderRadius: '10px',
          textTransform: 'none',
          fontWeight: hasValue ? 700 : 600,
          fontSize: '0.8125rem',
          color: hasValue ? 'primary.main' : 'text.primary',
          bgcolor: hasValue ? 'rgba(79,70,229,0.06)' : 'background.paper',
          borderColor: hasValue ? 'primary.main' : 'divider',
          boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          justifyContent: 'flex-start',
          alignItems: 'center',
          transition: 'all 0.15s ease',
          '&:hover': {
            bgcolor: hasValue ? 'rgba(79,70,229,0.1)' : 'action.hover',
            borderColor: hasValue ? 'primary.main' : 'text.disabled',
            boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
          },
          '& .MuiButton-endIcon': { ml: 'auto', flexShrink: 0 },
          '& .MuiButton-startIcon': { mr: 0.5, flexShrink: 0 },
        }}
      >
        <Box
          component="span"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
          }}
        >
          {triggerLabel}
        </Box>
      </Button>

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1400 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 6] } }]}
      >
        <ClickAwayListener
          onClickAway={() => {
            setAnchorEl(null);
            setQuery('');
          }}
        >
          <Paper
            elevation={0}
            sx={{
              width: Math.max(minWidth + 40, 260),
              maxWidth: 360,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
              overflow: 'hidden',
            }}
          >
            {searchable && (
              <Box sx={{ p: 1.25, pb: 0.75 }}>
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        bgcolor: 'action.hover',
                      },
                    },
                  }}
                />
              </Box>
            )}

            {multiple && options.length > 0 && (
              <>
                <ListItemButton
                  dense
                  onClick={handleSelectAll}
                  sx={{ px: 1.5, py: 0.75 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={allSelected}
                      indeterminate={
                        selectedValues.length > 0 && !allSelected
                      }
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={allLabel}
                    primaryTypographyProps={{
                      fontWeight: 700,
                      fontSize: '0.8125rem',
                    }}
                  />
                </ListItemButton>
                <Divider />
              </>
            )}

            <List
              dense
              sx={{
                maxHeight,
                overflowY: 'auto',
                py: 0.5,
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: 'divider',
                  borderRadius: 8,
                },
              }}
            >
              {!multiple && (
                <ListItemButton
                  dense
                  selected={!hasValue}
                  onClick={() => {
                    onChange('');
                    setAnchorEl(null);
                  }}
                  sx={{ px: 1.5 }}
                >
                  <ListItemText
                    primary={`All ${label}s`}
                    primaryTypographyProps={{
                      fontSize: '0.8125rem',
                      color: 'text.secondary',
                    }}
                  />
                </ListItemButton>
              )}

              {filtered.length === 0 ? (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    No matches
                  </Typography>
                </Box>
              ) : (
                filtered.map((opt) => {
                  const checked = selectedValues.includes(opt.value);
                  return (
                    <ListItemButton
                      key={String(opt.value)}
                      dense
                      selected={!multiple && checked}
                      onClick={() => handleToggle(opt.value)}
                      sx={{
                        px: 1.5,
                        transition: 'background 0.12s ease',
                      }}
                    >
                      {multiple && (
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Checkbox
                            edge="start"
                            size="small"
                            checked={checked}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                      )}
                      {opt.icon && (
                        <ListItemIcon sx={{ minWidth: 32 }}>{opt.icon}</ListItemIcon>
                      )}
                      <ListItemText
                        primary={opt.label}
                        primaryTypographyProps={{
                          fontSize: '0.8125rem',
                          fontWeight: checked ? 700 : 500,
                          noWrap: true,
                        }}
                      />
                    </ListItemButton>
                  );
                })
              )}
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
