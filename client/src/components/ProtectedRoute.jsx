import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { isTokenExpired, useRole } from '../context/RoleContext';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { loading, role } = useRole();
  const token = localStorage.getItem('authToken');

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!token || isTokenExpired(token) || role !== 'superadmin') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
