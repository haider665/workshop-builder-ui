import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

export function ConcernsPage() {
  const concernCategories = useCwStore((s) => s.concernCategories)
  const concerns = useCwStore((s) => s.concerns)
  const createConcernCategory = useCwStore((s) => s.createConcernCategory)
  const updateConcernCategory = useCwStore((s) => s.updateConcernCategory)
  const createConcern = useCwStore((s) => s.createConcern)
  const updateConcern = useCwStore((s) => s.updateConcern)
  const shops = useCwStore((s) => s.shops)

  // New category form
  const [newCatName, setNewCatName] = useState('')
  const [newCatShopId, setNewCatShopId] = useState('')
  // New concern form
  const [newConcernCatId, setNewConcernCatId] = useState('')
  const [newConcernCode, setNewConcernCode] = useState('')
  const [newConcernName, setNewConcernName] = useState('')
  const [newConcernEstTime, setNewConcernEstTime] = useState('30')

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  function submitCategory() {
    try {
      setError(null)
      if (!newCatShopId) throw new Error('Select a shop')
      const cat = createConcernCategory({ name: newCatName, shopId: newCatShopId })
      setNewCatName('')
      setNewCatShopId('')
      setSuccessMessage(`Category created: ${cat.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function submitConcern() {
    try {
      setError(null)
      if (!newConcernCatId) throw new Error('Select a category')
      const estHrs = newConcernEstTime.trim() ? Number(newConcernEstTime.trim()) : undefined
      const c = createConcern({ categoryId: newConcernCatId, code: newConcernCode.trim(), name: newConcernName, processTimeMins: estHrs })
      setNewConcernCode('')
      setNewConcernName('')
      setNewConcernEstTime('30')
      setSuccessMessage(`Concern created: ${c.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function toggleCatStatus(id: string, current: string) {
    const cat = concernCategories.find((c) => c.id === id)
    if (!cat) return
    updateConcernCategory(id, { name: cat.name, shopId: cat.shopId, status: current === 'Active' ? 'Inactive' : 'Active' })
  }

  function toggleConcernStatus(id: string, current: string) {
    const c = concerns.find((x) => x.id === id)
    if (!c) return
    updateConcern(id, { name: c.name, status: current === 'Active' ? 'Inactive' : 'Active' })
  }

  const catById = new Map(concernCategories.map((c) => [c.id, c]))
  const shopById = new Map(shops.map((s) => [s.id, s]))
  const activeShops = shops.filter((s) => s.status === 'Active')

  return (
    <Page title="Admin / Concerns" subtitle="Manage concern categories and items used in appointments.">
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Add Category ── */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Add Concern Category</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Shop</InputLabel>
              <Select
                label="Shop"
                value={newCatShopId}
                onChange={(e) => setNewCatShopId(e.target.value)}
              >
                {activeShops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Category name"
              size="small"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={submitCategory} sx={{ height: 40 }}>
              Add Category
            </Button>
          </Stack>
        </Paper>

        {/* ── Add Concern ── */}
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Add Concern Item</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={newConcernCatId}
                onChange={(e) => setNewConcernCatId(e.target.value)}
              >
                {concernCategories
                  .filter((c) => c.status === 'Active')
                  .map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="Code"
              size="small"
              value={newConcernCode}
              onChange={(e) => setNewConcernCode(e.target.value)}
              placeholder="e.g. CC-BRK-001"
              sx={{ width: 160 }}
            />
            <TextField
              label="Concern name"
              size="small"
              value={newConcernName}
              onChange={(e) => setNewConcernName(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Process Time (mins)"
              size="small"
              type="number"
              value={newConcernEstTime}
              onChange={(e) => setNewConcernEstTime(e.target.value)}
              sx={{ width: 160 }}
            />
            <Button variant="contained" onClick={submitConcern} sx={{ height: 40 }}>
              Add Concern
            </Button>
          </Stack>
        </Paper>

        {/* ── Categories table ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>Categories ({concernCategories.length})</Typography>
          </Box>
          <Divider />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Shop</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {concernCategories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell>{cat.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={shopById.get(cat.shopId)?.name ?? '—'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={concerns.filter((c) => c.categoryId === cat.id).length}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={cat.status}
                      color={cat.status === 'Active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => toggleCatStatus(cat.id, cat.status)}>
                      {cat.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Concerns table ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 900 }}>All Concerns ({concerns.length})</Typography>
          </Box>
          <Divider />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Concern</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Process Time (mins)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {concerns.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {c.code || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {catById.get(c.categoryId)?.name ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>{c.name}{typeof c.processTimeMins === 'number' ? ` (${c.processTimeMins}m)` : ''}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {typeof c.processTimeMins === 'number' ? `${c.processTimeMins}m` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.status}
                      color={c.status === 'Active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => toggleConcernStatus(c.id, c.status)}>
                      {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Stack>
    </Page>
  )
}
