import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('UI ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 520,
            width: '100%',
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Task Tracker hit an unexpected error. You can try again or reload the page.
          </Typography>
          {import.meta.env.DEV && this.state.error?.message ? (
            <Typography
              variant="caption"
              component="pre"
              sx={{
                textAlign: 'left',
                bgcolor: 'action.hover',
                p: 1.5,
                borderRadius: 2,
                overflow: 'auto',
                mb: 3,
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error.message}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={this.handleReset}>
              Try again
            </Button>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReload}>
              Reload page
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }
}
