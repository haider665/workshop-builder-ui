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
import { useEffect, useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import type { CWConcern, CWConcernCategory, CWShop } from '../../types/cw'
import { shopsService } from '../../services/admin/shopsService'
import { concernsService } from '../../services/admin/concernsService'

export function ConcernsPage() {
  const [shops, setShops] = useState<CWShop[]>([])
  const [concernCategories, setConcernCategories] = useState<CWConcernCategory[]>([])
  const [concerns, setConcerns] = useState<CWConcern[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newCatName, setNewCatName] = useState('')
  const [newCatShopId, setNewCatShopId] = useState('')
  const [newConcernCatId, setNewConcernCatId] = useState('')
  const [newConcernCode, setNewConcernCode] = useState('')
  const [newConcernName, setNewConcernName] = useState('')
  const [newConcernEstTime, setNewConcernEstTime] = useState('30')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [shopData, categoryData, concernData] = await Promise.all([
          shopsService.list(),
          concernsService.listCategories(),
          concernsService.list(),
        ])
        if (!active) return
        setShops(shopData)
        setConcernCategories(categoryData)
        setConcerns(concernData)
        if (!newCatShopId && shopData.length) setNewCatShopId(shopData[0]!.id)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load concerns')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
    // one-time load on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const catById = useMemo(() => {
    return new Map(concernCategories.map((c) => [c.id, c]))
  }, [concernCategories])
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops])
  const activeShops = shops.filter((s) => s.status === 'Active')

  async function submitCategory() {
    try {
      setSaving(true)
      setError(null)
      if (!newCatShopId) throw new Error('Select a shop')
      const cat = await concernsService.createCategory({ name: newCatName, shopId: newCatShopId })
      setConcernCategories((current) => [cat, ...current.filter((item) => item.id !== cat.id)])
      setNewCatName('')
      setNewCatShopId('')
      setSuccessMessage(`Category created: ${cat.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function submitConcern() {
    try {
      setSaving(true)
      setError(null)
      if (!newConcernCatId) throw new Error('Select a category')
      const estMins = newConcernEstTime.trim() ? Number(newConcernEstTime.trim()) : undefined
      const c = await concernsService.create({
        categoryId: newConcernCatId,
        code: newConcernCode.trim(),
        name: newConcernName,
        processTimeMins: estMins,
      })
      setConcerns((current) => [c, ...current.filter((item) => item.id !== c.id)])
      setNewConcernCode('')
      setNewConcernName('')
      setNewConcernEstTime('30')
      setSuccessMessage(`Concern created: ${c.name}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleCatStatus(id: string, current: string) {
    const cat = concernCategories.find((c) => c.id === id)
    if (!cat) return
    try {
      setSaving(true)
      setError(null)
      const updated = await concernsService.setCategoryStatus(
        id,
        current === 'Active' ? 'Inactive' : 'Active',
      )
      setConcernCategories((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleConcernStatus(id: string, current: string) {
    const c = concerns.find((x) => x.id === id)
    if (!c) return
    try {
      setSaving(true)
      setError(null)
      const updated = await concernsService.setStatus(id, current === 'Active' ? 'Inactive' : 'Active')
      setConcerns((items) => items.map((item) => (item.id === updated.id ? updated : item)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

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

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Paper sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography color="text.secondary">Loading concerns from backend...</Typography>
        </Paper>
      ) : null}

      <Stack spacing={3}>
        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Add Concern Category</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Shop</InputLabel>
              <Select label="Shop" value={newCatShopId} onChange={(e) => setNewCatShopId(e.target.value)}>
                {activeShops.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
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
            <Button variant="contained" onClick={() => void submitCategory()} sx={{ height: 40 }} disabled={saving}>
              Add Category
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 900, mb: 2 }}>Add Concern Item</Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Category</InputLabel>
              <Select label="Category" value={newConcernCatId} onChange={(e) => setNewConcernCatId(e.target.value)}>
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
            <Button variant="contained" onClick={() => void submitConcern()} sx={{ height: 40 }} disabled={saving}>
              Add Concern
            </Button>
          </Stack>
        </Paper>

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
                    <Button size="small" onClick={() => void toggleCatStatus(cat.id, cat.status)} disabled={saving}>
                      {cat.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

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
                  <TableCell>
                    {c.name}
                  </TableCell>
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
                    <Button size="small" onClick={() => void toggleConcernStatus(c.id, c.status)} disabled={saving}>
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
