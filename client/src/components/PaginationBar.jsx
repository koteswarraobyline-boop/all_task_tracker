import React from 'react';
import { Box, MenuItem, TextField, Typography, Pagination, useTheme } from '@mui/material';
import { tokens } from '../theme';

/**
 * Shared pagination footer — consistent across tables and lists.
 * Uses 1-based pages by default; set zeroBasedPage for zero-indexed callers.
 */
export default function PaginationBar({
  page = 1,
  pageCount = 1,
  totalCount = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [6, 10, 20, 50],
  itemLabel = 'items',
  zeroBasedPage = false,
  showRowsPerPage = true,
  embedded = false,
  hideWhenEmpty = true,
  sx = {},
}) {
  const theme = useTheme();
  const isRtl = theme.direction === 'rtl';

  const safePageCount = Math.max(1, pageCount);
  const currentPage = Math.min(
    Math.max(1, zeroBasedPage ? page + 1 : page),
    safePageCount
  );

  const from = totalCount === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const to = totalCount === 0 ? 0 : Math.min(currentPage * rowsPerPage, totalCount);

  if (hideWhenEmpty && totalCount <= 0) return null;

  const handlePageChange = (_event, value) => {
    const next = zeroBasedPage ? value - 1 : value;
    onPageChange?.(next);
  };

  const rangeText =
    totalCount === 0
      ? `Showing 0 of 0 ${itemLabel}`
      : `Showing ${from}\u2013${to} of ${totalCount} ${itemLabel}`;

  return (
    <Box
      component="nav"
      aria-label={`${itemLabel} pagination`}
      dir={theme.direction}
      sx={{
        width: '100%',
        ...(embedded
          ? {
              borderTop: '1px solid',
              borderColor: tokens.colors.border,
              bgcolor: '#FAFBFC',
              px: { xs: 2, md: 3 },
              py: { xs: 2, md: 2.25 },
            }
          : { mt: 2.5 }),
        ...sx,
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 2, md: 3 },
        }}
      >
        <Typography
          component="p"
          aria-live="polite"
          sx={{
            flex: '1 1 auto',
            fontSize: '0.8125rem',
            color: tokens.colors.textSecondary,
            fontWeight: 500,
            lineHeight: 1.5,
            m: 0,
            minWidth: 0,
            whiteSpace: { md: 'nowrap' },
          }}
        >
          {rangeText}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: { xs: 'stretch', sm: 'flex-end' },
            gap: { xs: 1.5, sm: 2.5 },
            flexShrink: 0,
            ml: { md: 'auto' },
          }}
        >
          {showRowsPerPage && onRowsPerPageChange ? (
            <TextField
              select
              size="small"
              value={rowsPerPage}
              onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
              sx={{
                minWidth: { xs: '100%', sm: 132 },
                width: { xs: '100%', sm: 'auto' },
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                  height: 36,
                  borderRadius: `${tokens.radius.button}px`,
                  bgcolor: tokens.colors.card,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: tokens.colors.text,
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.colors.border },
              }}
              slotProps={{
                select: {
                  'aria-label': 'Rows per page',
                },
              }}
            >
              {rowsPerPageOptions.map((n) => (
                <MenuItem key={n} value={n}>
                  {n} per page
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {safePageCount > 1 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-end' },
                flexShrink: 0,
                ml: { sm: showRowsPerPage && onRowsPerPageChange ? 0.5 : 0 },
                pl: { sm: showRowsPerPage && onRowsPerPageChange ? 2 : 0 },
                borderLeft: {
                  sm:
                    showRowsPerPage && onRowsPerPageChange
                      ? `1px solid ${tokens.colors.border}`
                      : 'none',
                },
              }}
            >
              <Pagination
                count={safePageCount}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                size="small"
                siblingCount={1}
                boundaryCount={1}
                showFirstButton={false}
                showLastButton={false}
                getItemAriaLabel={(type, pageNum, selected) => {
                  if (type === 'previous') {
                    return isRtl ? 'Next page' : 'Previous page';
                  }
                  if (type === 'next') {
                    return isRtl ? 'Previous page' : 'Next page';
                  }
                  if (selected) {
                    return `Page ${pageNum}, current page`;
                  }
                  return `Go to page ${pageNum}`;
                }}
                sx={{
                  '& .MuiPagination-ul': {
                    flexWrap: 'nowrap',
                    gap: 0.5,
                    m: 0,
                  },
                  '& .MuiPaginationItem-root': {
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    minWidth: 34,
                    height: 34,
                    mx: 0.25,
                  },
                  '& .Mui-selected': {
                    fontWeight: 700,
                  },
                }}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
