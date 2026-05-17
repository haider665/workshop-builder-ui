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
import { useMemo, useState } from 'react'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'

function fmt(n: number) {
  return n.toLocaleString('en-BD')
}

const SERVICE_CATEGORIES = [
  'Periodic Maintenance',
  'Engine',
  'Transmission',
  'Suspension',
  'Brakes',
  'Electrical',
  'HVAC',
  'Body & Paint',
  'Glass & Trim',
  'Inspection',
  'Custom',
]

export function ServicesPage() {
  const services = useCwStore((s) => s.services)
  const createService = useCwStore((s) => s.createService)
  const updateService = useCwStore((s) => s.updateService)
  const setServiceStatus = useCwStore((s) => s.setServiceStatus)

  const [filterCat, setFilterCat] = useState('')
  const [filterQuery, setFilterQuery] = useState('')

  // Add form
  const [addOpen, setAddOpen] = useState(false)
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [timeHrs, setTimeHrs] = useState('')
  const [ratePerHr, setRatePerHr] = useState('1500')
  const [price, setPrice] = useState('')

  // Edit form
  const [editId, setEditId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTimeHrs, setEditTimeHrs] = useState('')
  const [editRatePerHr, setEditRatePerHr] = useState('')
  const [editPrice, setEditPrice] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const categories = useMemo(() => {
    const cats = new Set(services.map((s) => s.category))
    return [...cats].sort()
  }, [services])

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (filterCat && s.category !== filterCat) return false
      if (filterQuery) {
        const q = filterQuery.toLowerCase()
        if (!s.code.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [services, filterCat, filterQuery])

  function autoPrice() {
    const t = parseFloat(timeHrs)
    const r = parseFloat(ratePerHr)
    if (!isNaN(t) && !isNaN(r)) setPrice(String(Math.round(t * r)))
  }

  function submitAdd() {
    try {
      setError(null)
      if (!code.trim()) throw new Error('Code is required')
      if (!category) throw new Error('Category is required')
      if (!description.trim()) throw new Error('Description is required')
      const t = parseFloat(timeHrs)
      const r = parseFloat(ratePerHr)
      const p = parseFloat(price)
      if (isNaN(t) || t <= 0) throw new Error('Valid time (hrs) is required')
      if (isNaN(r) || r <= 0) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')
      const svc = createService({ code: code.trim(), category, description: description.trim(), timeHrs: t, ratePerHr: r, price: p })
      setCode(''); setCategory(''); setDescription(''); setTimeHrs(''); setRatePerHr('1500'); setPrice('')
      setAddOpen(false)
      setSuccessMessage(`Service created: ${svc.code}`)
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function startEdit(id: string) {
    const s = services.find((x) => x.id === id)
    if (!s) return
    setEditId(id)
    setEditCode(s.code)
    setEditCategory(s.category)
    setEditDescription(s.description)
    setEditTimeHrs(String(s.timeHrs))
    setEditRatePerHr(String(s.ratePerHr))
    setEditPrice(String(s.price))
    setError(null)
  }

  function submitEdit() {
    try {
      setError(null)
      if (!editId) return
      const svc = services.find((x) => x.id === editId)
      if (!svc) return
      const t = parseFloat(editTimeHrs)
      const r = parseFloat(editRatePerHr)
      const p = parseFloat(editPrice)
      if (!editCode.trim()) throw new Error('Code is required')
      if (!editCategory) throw new Error('Category is required')
      if (!editDescription.trim()) throw new Error('Description is required')
      if (isNaN(t) || t <= 0) throw new Error('Valid time (hrs) is required')
      if (isNaN(r) || r <= 0) throw new Error('Valid rate/hr is required')
      if (isNaN(p) || p <= 0) throw new Error('Valid price is required')
      updateService(editId, {
        code: editCode.trim(),
        category: editCategory,
        description: editDescription.trim(),
        timeHrs: t,
        ratePerHr: r,
        price: p,
        status: svc.status,
      })
      setEditId(null)
      setSuccessMessage('Service updated')
      setSuccessOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page
      title="Admin / Services"
      subtitle="Manage service catalogue used in appointments."
      actions={
        <Button variant="contained" onClick={() => setAddOpen((v) => !v)}>
          {addOpen ? 'Cancel' : '+ Add Service'}
        </Button>
      }
    >
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

      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Add form ── */}
        {addOpen && (
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'primary.main' }}>
            <Typography sx={{ fontWeight: 900, mb: 2 }}>New Service</Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <TextField label="Code" size="small" value={code} onChange={(e) => setCode(e.target.value)} sx={{ flex: '1 1 120px' }} />
                <FormControl size="small" sx={{ flex: '1 1 200px' }}>
                  <InputLabel>Category</InputLabel>
                  <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {SERVICE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Description" size="small" value={description} onChange={(e) => setDescription(e.target.value)} sx={{ flex: '2 1 300px' }} />
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                <TextField
                  label="Time (hrs)"
                  size="small"
                  type="number"
                  value={timeHrs}
                  onChange={(e) => setTimeHrs(e.target.value)}
                  onBlur={autoPrice}
                  sx={{ flex: '1 1 100px' }}
                />
                <TextField
                  label="Rate/hr (BDT)"
                  size="small"
                  type="number"
                  value={ratePerHr}
                  onChange={(e) => setRatePerHr(e.target.value)}
                  onBlur={autoPrice}
                  sx={{ flex: '1 1 130px' }}
                />
                <TextField
                  label="Price (BDT)"
                  size="small"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  sx={{ flex: '1 1 130px' }}
                />
                <Button variant="contained" onClick={submitAdd} sx={{ height: 40 }}>
                  Save
                </Button>
              </Stack>
            </Stack>
          </Paper>
        )}

        {/* ── Filters ── */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            label="Search code or description"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            sx={{ flex: '2 1 250px' }}
          />
          <FormControl size="small" sx={{ flex: '1 1 200px' }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <MenuItem value="">All categories</MenuItem>
              {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Showing {filtered.length} of {services.length} services
        </Typography>

        {/* ── Table ── */}
        <Paper sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Time (hrs)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Rate/hr</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Price (BDT)</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) =>
                editId === s.id ? (
                  <TableRow key={s.id} sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><TextField size="small" value={editCode} onChange={(e) => setEditCode(e.target.value)} sx={{ width: 90 }} /></TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                          {SERVICE_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell><TextField size="small" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} sx={{ minWidth: 200 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" value={editTimeHrs} onChange={(e) => setEditTimeHrs(e.target.value)} sx={{ width: 80 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" value={editRatePerHr} onChange={(e) => setEditRatePerHr(e.target.value)} sx={{ width: 90 }} /></TableCell>
                    <TableCell align="right"><TextField size="small" type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} sx={{ width: 100 }} /></TableCell>
                    <TableCell>—</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" variant="contained" onClick={submitEdit}>Save</Button>
                        <Button size="small" onClick={() => setEditId(null)}>Cancel</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        {s.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.category} variant="outlined" />
                    </TableCell>
                    <TableCell>{s.description}</TableCell>
                    <TableCell align="right">{s.timeHrs}</TableCell>
                    <TableCell align="right">{fmt(s.ratePerHr)}</TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 700 }}>{fmt(s.price)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.status}
                        color={s.status === 'Active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" onClick={() => startEdit(s.id)}>Edit</Button>
                        <Button
                          size="small"
                          color={s.status === 'Active' ? 'warning' : 'success'}
                          onClick={() => setServiceStatus(s.id, s.status === 'Active' ? 'Inactive' : 'Active')}
                        >
                          {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No services found</Typography>
            </Box>
          )}
        </Paper>
      </Stack>
    </Page>
  )
}
