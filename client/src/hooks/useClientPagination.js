import { useMemo, useState, useEffect } from 'react';

/**
 * Client-side pagination helper for list pages.
 * Returns page slice + PaginationBar-ready props.
 */
export function useClientPagination(items = [], { initialRows = 10, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRows);
  const list = Array.isArray(items) ? items : [];

  useEffect(() => {
    setPage(1);
  }, [resetKey, rowsPerPage, list.length]);

  const pageCount = Math.max(1, Math.ceil(list.length / rowsPerPage) || 1);
  const safePage = Math.min(page, pageCount);

  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return list.slice(start, start + rowsPerPage);
  }, [list, safePage, rowsPerPage]);

  return {
    page: safePage,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    pageCount,
    totalCount: list.length,
    pagedItems,
  };
}

export default useClientPagination;
