import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Page } from '../../components/Page'

export function AdminHome() {
  return (
    <Page
      title="Admin"
      subtitle="Configuration hub (MVP: in-memory only)."
    >
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Next up
          </Typography>
          <Typography color="text.secondary">
            We’ll build Shops, Bays, Task Templates, Roles, and Users here first (Milestone 4).
          </Typography>
        </Stack>
      </Paper>

      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr',
          },
        }}
      >
        {[
          {
            title: 'Shops',
            desc: 'Create and manage shops (Auto/Paint/Body/etc).',
            to: '/admin/shops',
          },
          {
            title: 'Bays',
            desc: 'Create bays within a shop.',
            to: '/admin/bays',
          },
          {
            title: 'Task Templates',
            desc: 'Build tasks + dynamic forms (critical).',
            to: '/admin/task-templates',
          },
          {
            title: 'Roles',
            desc: 'Create custom roles for the workshop.',
            to: '/admin/roles',
          },
          {
            title: 'Users',
            desc: 'Create users and assign roles + shops.',
            to: '/admin/users',
          },
          {
            title: 'F1',
            desc: 'Configure return window and view reports.',
            to: '/admin/f1',
          },
          {
            title: 'Concerns',
            desc: 'Manage concern categories and items used in appointments.',
            to: '/admin/concerns',
          },
          {
            title: 'Services',
            desc: 'Manage services catalogue with BDT pricing.',
            to: '/admin/services',
          },
        ].map((card) => (
          <Card key={card.to} variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to={card.to} sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {card.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {card.desc}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" component={RouterLink} to="/admin/shops">
          Start: Shops
        </Button>
      </Stack>
    </Page>
  )
}
