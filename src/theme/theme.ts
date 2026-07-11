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
  },
})
