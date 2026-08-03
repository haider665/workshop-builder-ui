import { alpha, createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: ['"Plus Jakarta Sans Variable"', 'Roboto', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'].join(
      ',',
    ),
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: `linear-gradient(${alpha('#000', 0.02)}, ${alpha(
            '#000',
            0.02,
          )})`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          maxHeight: 'calc(100% - 32px)',
          '@media (max-width:600px)': {
            margin: 8,
            width: 'calc(100% - 16px)',
            maxWidth: 'calc(100% - 16px)',
            maxHeight: 'calc(100% - 16px)',
            borderRadius: 16,
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          overflowX: 'hidden',
          '@media (max-width:600px)': {
            paddingLeft: 16,
            paddingRight: 16,
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          flexWrap: 'wrap',
          gap: 8,
          '@media (max-width:600px)': {
            padding: 16,
            flexDirection: 'column-reverse',
            alignItems: 'stretch',
            '& > :not(style)': {
              margin: 0,
              width: '100%',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: 0,
          maxWidth: '100%',
          whiteSpace: 'normal',
          lineHeight: 1.25,
          textAlign: 'center',
        },
      },
    },
  },
})
