import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Page } from '../../components/Page'
import { useCwStore } from '../../store/cwStore'
import type { CWVehicleCategory, CWVehicleSize } from '../../types/cw'

const CATEGORIES: CWVehicleCategory[] = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Van', 'Truck', 'Bus', 'Other']
const SIZES: CWVehicleSize[] = ['Small', 'Medium', 'Large']
const COUNTRIES = ['Bangladesh', 'India', 'China', 'Japan', 'South Korea', 'Germany', 'USA', 'Thailand', 'Indonesia', 'Other']
const COLORS = ['Blizzard White', 'Midnight Black', 'Silver Metallic', 'Deep Blue', 'Ruby Red', 'Forest Green', 'Champagne Gold', 'Beige', 'Grey']
const TYRE_SIZES = ['165/70R14', '175/65R15', '185/75R15', '195/65R15', '205/55R16', '215/60R16', '225/45R17', '235/55R18', '255/55R19']

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', mb: 2 }}>{children}</Typography>
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { sm: 'center' }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
      spacing={2}
    >
      <Typography variant="body2" color="text.secondary" sx={{ width: { sm: 200 }, flexShrink: 0, fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  )
}

export function CreateVehiclePage() {
  const navigate = useNavigate()
  const customers = useCwStore((s) => s.customers)
  const createVehicle = useCwStore((s) => s.createVehicle)

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  // General Information
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<CWVehicleCategory | ''>('')
  const [vehicleSize, setVehicleSize] = useState<CWVehicleSize | ''>('')
  const [modelVariant, setModelVariant] = useState('')
  const [countryOfOrigin, setCountryOfOrigin] = useState('')
  const [countryOfAssembly, setCountryOfAssembly] = useState('')
  const [vin, setVin] = useState('')
  const [registrationNo, setRegistrationNo] = useState('')

  // Customer
  const [customerId, setCustomerId] = useState('')
  const [isSelfDriven, setIsSelfDriven] = useState(true)
  const [driverName, setDriverName] = useState('')
  const [driverNumber, setDriverNumber] = useState('')
  const [isPersonalUse, setIsPersonalUse] = useState(true)

  // Others
  const [exteriorColor, setExteriorColor] = useState('')
  const [exteriorColorCode, setExteriorColorCode] = useState('')
  const [interiorColor, setInteriorColor] = useState('')
  const [interiorColorCode, setInteriorColorCode] = useState('')
  const [tyreSize, setTyreSize] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')

  const sortedCustomers = useMemo(
    () => customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [customers],
  )

  function submit() {
    try {
      setError(null)
      if (!customerId) throw new Error('Select a customer')
      if (!registrationNo.trim()) throw new Error('Registration number is required')

      const created = createVehicle({
        customerId,
        registrationNo: registrationNo.trim(),
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        vehicleCategory: vehicleCategory || undefined,
        vehicleSize: vehicleSize || undefined,
        modelVariant: modelVariant.trim() || undefined,
        countryOfOrigin: countryOfOrigin || undefined,
        countryOfAssembly: countryOfAssembly || undefined,
        vin: vin.trim() || undefined,
        exteriorColor: exteriorColor || undefined,
        exteriorColorCode: exteriorColorCode.trim() || undefined,
        interiorColor: interiorColor || undefined,
        interiorColorCode: interiorColorCode.trim() || undefined,
        tyreSize: tyreSize || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
      })

      setSuccessOpen(true)
      setTimeout(() => navigate(`/cre/vehicles/${created.id}`), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Page title="New Vehicle" subtitle="Create Add New Model from here">
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Vehicle created successfully
        </Alert>
      </Snackbar>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        {/* General Information */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>General Information</SectionTitle>
          <FormRow label="Brand">
            <TextField size="small" fullWidth value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. BMW, Toyota" />
          </FormRow>
          <FormRow label="Model">
            <TextField size="small" fullWidth value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. X5, Corolla" />
          </FormRow>
          <FormRow label="Vehicle Category">
            <TextField size="small" select fullWidth value={vehicleCategory} onChange={(e) => setVehicleCategory(e.target.value as CWVehicleCategory)}>
              <MenuItem value="">— Select —</MenuItem>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Vehicle Size">
            <TextField size="small" select fullWidth value={vehicleSize} onChange={(e) => setVehicleSize(e.target.value as CWVehicleSize)}>
              <MenuItem value="">— Select —</MenuItem>
              {SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Model Variant">
            <TextField size="small" fullWidth value={modelVariant} onChange={(e) => setModelVariant(e.target.value)} placeholder="e.g. M50i, XLE" />
          </FormRow>
          <FormRow label="Country of Origin">
            <TextField size="small" select fullWidth value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)}>
              <MenuItem value="">— Select —</MenuItem>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Country of Assembly">
            <TextField size="small" select fullWidth value={countryOfAssembly} onChange={(e) => setCountryOfAssembly(e.target.value)}>
              <MenuItem value="">— Select —</MenuItem>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="VIN">
            <TextField size="small" fullWidth value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Vehicle Identification Number" />
          </FormRow>
          <FormRow label="Registration Number">
            <TextField size="small" fullWidth value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="e.g. Dhaka-Metro-Ga-31-9999" required />
          </FormRow>
        </Paper>

        {/* Customer */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Customer</SectionTitle>
          <FormRow label="Customer">
            <TextField size="small" select fullWidth value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <MenuItem value="">— Select Customer —</MenuItem>
              {sortedCustomers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.fullName} · {c.phone}</MenuItem>
              ))}
            </TextField>
          </FormRow>
          <FormRow label="Driver">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={isSelfDriven} onChange={(e) => setIsSelfDriven(e.target.checked)} size="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isSelfDriven ? 'Self Driven' : 'Other Driver'}
              </Typography>
            </Box>
          </FormRow>
          {!isSelfDriven && (
            <>
              <FormRow label="Driver Name">
                <TextField size="small" fullWidth value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </FormRow>
              <FormRow label="Driver Number">
                <TextField size="small" fullWidth value={driverNumber} onChange={(e) => setDriverNumber(e.target.value)} />
              </FormRow>
            </>
          )}
          <FormRow label="User">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={isPersonalUse} onChange={(e) => setIsPersonalUse(e.target.checked)} size="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isPersonalUse ? 'Personal Use' : 'Corporate Use'}
              </Typography>
            </Box>
          </FormRow>
        </Paper>

        {/* Others */}
        <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
          <SectionTitle>Others</SectionTitle>
          <FormRow label="Exterior Colour">
            <TextField size="small" select fullWidth value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)}>
              <MenuItem value="">— Select —</MenuItem>
              {COLORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Exterior Colour Code">
            <TextField size="small" fullWidth value={exteriorColorCode} onChange={(e) => setExteriorColorCode(e.target.value)} placeholder="e.g. 070" />
          </FormRow>
          <FormRow label="Interior Colour">
            <TextField size="small" select fullWidth value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)}>
              <MenuItem value="">— Select —</MenuItem>
              {COLORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Interior Colour Code">
            <TextField size="small" fullWidth value={interiorColorCode} onChange={(e) => setInteriorColorCode(e.target.value)} placeholder="e.g. 011" />
          </FormRow>
          <FormRow label="Tyre Size">
            <TextField size="small" select fullWidth value={tyreSize} onChange={(e) => setTyreSize(e.target.value)}>
              <MenuItem value="">— Select —</MenuItem>
              {TYRE_SIZES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Additional Notes">
            <TextField size="small" fullWidth multiline rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Regular maintenance notes..." />
          </FormRow>
        </Paper>

        {/* Actions */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="text" size="large" onClick={() => navigate('/cre/vehicles')} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" size="large" onClick={submit} sx={{ fontWeight: 700, px: 4 }}>
            Add Vehicle
          </Button>
        </Stack>
      </Stack>
    </Page>
  )
}
