import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  DirectionsCar,
  Person,
  Palette,
} from '@mui/icons-material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { DocumentEvidenceEditor } from '../../components/DocumentEvidenceEditor'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import { colors, radii, pageLayout } from '../../theme/tokens'
import type { CWGateVehicleDocument, CWVehicleCategory, CWVehicleDocumentType, CWVehicleSize } from '../../types/cw'

const CATEGORIES: CWVehicleCategory[] = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Van', 'Truck', 'Bus', 'Other']
const SIZES: CWVehicleSize[] = ['Small', 'Medium', 'Large']
const COUNTRIES = ['Bangladesh', 'India', 'China', 'Japan', 'South Korea', 'Germany', 'USA', 'Thailand', 'Indonesia', 'Other']
const COLORS = ['Blizzard White', 'Midnight Black', 'Silver Metallic', 'Deep Blue', 'Ruby Red', 'Forest Green', 'Champagne Gold', 'Beige', 'Grey']
const TYRE_SIZES = ['165/70R14', '175/65R15', '185/75R15', '195/65R15', '205/55R16', '215/60R16', '225/45R17', '235/55R18', '255/55R19']
const REG_CITIES = ['Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur', 'Barishal', 'Mymensingh', 'Comilla', 'Gazipur', 'Narayanganj']
const REG_REGIONS = ['Metro', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'M']
const REG_CLASSES = ['Ga', 'Gha', 'Cha', 'Ja', 'Ka', 'Kha', 'Da', 'Tha', 'Ta', 'Pa', 'Ba', 'Ma', 'Ra', 'La', 'Sha', 'Sa', 'Ha']
const VEHICLE_DOCUMENT_TYPES: CWVehicleDocumentType[] = ['Registration Certificate', 'Tax Token', 'Fitness Certificate', 'Insurance', 'Route Permit', 'Other']

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: radii.sm,
    fontSize: '0.85rem',
    bgcolor: colors.bg.page,
  },
} as const

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { sm: 'center' }, py: 1.25, borderBottom: `1px solid ${colors.border.subtle}` }}
      spacing={2}
    >
      <Typography sx={{ width: { sm: 200 }, flexShrink: 0, fontSize: '0.82rem', color: colors.slate[500], fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  )
}

export function CreateVehiclePage() {
  const navigate = useNavigate()
  useCREData()
  const customers = useCwStore((s) => s.customers)

  const [error, setError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // General Information
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<CWVehicleCategory | ''>('')
  const [vehicleSize, setVehicleSize] = useState<CWVehicleSize | ''>('')
  const [modelVariant, setModelVariant] = useState('')
  const [modelYear, setModelYear] = useState('')
  const [countryOfOrigin, setCountryOfOrigin] = useState('')
  const [countryOfAssembly, setCountryOfAssembly] = useState('')
  const [vin, setVin] = useState('')
  // Segmented registration fields
  const [regCity, setRegCity] = useState('')
  const [regRegion, setRegRegion] = useState('')
  const [regClass, setRegClass] = useState('')
  const [regSeries, setRegSeries] = useState('')
  const [regNumber, setRegNumber] = useState('')

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
  const [vehicleDocuments, setVehicleDocuments] = useState<CWGateVehicleDocument[]>([])

  const sortedCustomers = useMemo(
    () => customers.slice().sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [customers],
  )

  async function submit() {
    try {
      setError(null)
      setSaving(true)
      if (!customerId) throw new Error('Select a customer')
      const registrationNo = [regCity, regRegion, regClass, regSeries, regNumber].filter(Boolean).join('-')
      if (!registrationNo) throw new Error('Registration number is required')
      if (!vehicleSize) throw new Error('Vehicle size is required')

      const created = await workshopApi.createVehicle({
        customerId,
        registrationNo,
        make: make.trim() || undefined,
        model: model.trim() || undefined,
        vehicleCategory: vehicleCategory || undefined,
        vehicleSize: vehicleSize as CWVehicleSize,
        modelYear: modelYear ? parseInt(modelYear, 10) : undefined,
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
        vehicleDocuments,
      })

      // Push into store so list updates immediately
      useCwStore.setState((s) => ({ vehicles: [created, ...s.vehicles] }))
      setSuccessOpen(true)
      setTimeout(() => navigate(`/cre/vehicles/${created.id}`), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ py: pageLayout.py, px: pageLayout.px }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/cre/vehicles')} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}>
              <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
                New Vehicle
              </Typography>
              <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Create Add New Model from here</Typography>
            </Box>
          </Stack>
        </Stack>

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

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: radii.sm }}>{error}</Alert>}

        {/* General Information */}
        <SectionCard title="General Information" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />}>
          <FormRow label="Brand">
            <TextField size="small" fullWidth value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. BMW, Toyota" sx={fieldSx} />
          </FormRow>
          <FormRow label="Model">
            <TextField size="small" fullWidth value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. X5, Corolla" sx={fieldSx} />
          </FormRow>
          <FormRow label="Vehicle Category">
            <TextField size="small" select fullWidth value={vehicleCategory} onChange={(e) => setVehicleCategory(e.target.value as CWVehicleCategory)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Vehicle Size *">
            <TextField size="small" select fullWidth value={vehicleSize} onChange={(e) => setVehicleSize(e.target.value as CWVehicleSize)} required error={!vehicleSize} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Model Variant">
            <TextField size="small" fullWidth value={modelVariant} onChange={(e) => setModelVariant(e.target.value)} placeholder="e.g. M50i, XLE" sx={fieldSx} />
          </FormRow>
          <FormRow label="Model Year">
            <TextField size="small" fullWidth type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder="e.g. 2024" sx={fieldSx} slotProps={{ input: { inputProps: { min: 1990, max: 2030 } } }} />
          </FormRow>
          <FormRow label="Country of Origin">
            <TextField size="small" select fullWidth value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Country of Assembly">
            <TextField size="small" select fullWidth value={countryOfAssembly} onChange={(e) => setCountryOfAssembly(e.target.value)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="VIN">
            <TextField size="small" fullWidth value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Vehicle Identification Number" sx={fieldSx} />
          </FormRow>
          <FormRow label="Registration Number">
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField size="small" select value={regCity} onChange={(e) => setRegCity(e.target.value)} sx={{ minWidth: 120, ...fieldSx }} label="City">
                <MenuItem value="">City</MenuItem>
                {REG_CITIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>–</Typography>
              <TextField size="small" select value={regRegion} onChange={(e) => setRegRegion(e.target.value)} sx={{ minWidth: 90, ...fieldSx }} label="Region">
                <MenuItem value="">Region</MenuItem>
                {REG_REGIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>–</Typography>
              <TextField size="small" select value={regClass} onChange={(e) => setRegClass(e.target.value)} sx={{ minWidth: 80, ...fieldSx }} label="Class">
                <MenuItem value="">Class</MenuItem>
                {REG_CLASSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>–</Typography>
              <TextField size="small" value={regSeries} onChange={(e) => setRegSeries(e.target.value)} sx={{ width: 70, ...fieldSx }} label="Series" placeholder="31" />
              <Typography sx={{ fontSize: '0.85rem', color: colors.slate[400] }}>–</Typography>
              <TextField size="small" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} sx={{ width: 90, ...fieldSx }} label="Number" placeholder="9999" />
            </Stack>
            <Typography sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem', color: colors.slate[400] }}>
              Preview: {[regCity, regRegion, regClass, regSeries, regNumber].filter(Boolean).join('-') || '—'}
            </Typography>
          </FormRow>
        </SectionCard>

        {/* Customer */}
        <SectionCard title="Customer" icon={<Person sx={{ fontSize: '1rem' }} />} defaultCollapsed>
          <FormRow label="Customer">
            <TextField size="small" select fullWidth value={customerId} onChange={(e) => setCustomerId(e.target.value)} required sx={fieldSx}>
              <MenuItem value="">— Select Customer —</MenuItem>
              {sortedCustomers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.fullName} · {c.phone}</MenuItem>
              ))}
            </TextField>
          </FormRow>
          <FormRow label="Driver">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={isSelfDriven} onChange={(e) => setIsSelfDriven(e.target.checked)} size="small" />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>
                {isSelfDriven ? 'Self Driven' : 'Other Driver'}
              </Typography>
            </Box>
          </FormRow>
          {!isSelfDriven && (
            <>
              <FormRow label="Driver Name">
                <TextField size="small" fullWidth value={driverName} onChange={(e) => setDriverName(e.target.value)} sx={fieldSx} />
              </FormRow>
              <FormRow label="Driver Number">
                <TextField size="small" fullWidth value={driverNumber} onChange={(e) => setDriverNumber(e.target.value)} sx={fieldSx} />
              </FormRow>
            </>
          )}
          <FormRow label="User">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Switch checked={isPersonalUse} onChange={(e) => setIsPersonalUse(e.target.checked)} size="small" />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: colors.slate[900] }}>
                {isPersonalUse ? 'Personal Use' : 'Corporate Use'}
              </Typography>
            </Box>
          </FormRow>
        </SectionCard>

        {/* Others */}
        <SectionCard title="Additional Details" icon={<Palette sx={{ fontSize: '1rem' }} />} defaultCollapsed>
          <FormRow label="Exterior Colour">
            <TextField size="small" select fullWidth value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {COLORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Exterior Colour Code">
            <TextField size="small" fullWidth value={exteriorColorCode} onChange={(e) => setExteriorColorCode(e.target.value)} placeholder="e.g. 070" sx={fieldSx} />
          </FormRow>
          <FormRow label="Interior Colour">
            <TextField size="small" select fullWidth value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {COLORS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Interior Colour Code">
            <TextField size="small" fullWidth value={interiorColorCode} onChange={(e) => setInteriorColorCode(e.target.value)} placeholder="e.g. 011" sx={fieldSx} />
          </FormRow>
          <FormRow label="Tyre Size">
            <TextField size="small" select fullWidth value={tyreSize} onChange={(e) => setTyreSize(e.target.value)} sx={fieldSx}>
              <MenuItem value="">— Select —</MenuItem>
              {TYRE_SIZES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </FormRow>
          <FormRow label="Additional Notes">
            <TextField size="small" fullWidth multiline rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} placeholder="Regular maintenance notes..." sx={fieldSx} />
          </FormRow>
        </SectionCard>

        <SectionCard title="Vehicle Papers" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />} defaultCollapsed>
          <DocumentEvidenceEditor title="Registration and compliance papers" documents={vehicleDocuments} documentTypes={VEHICLE_DOCUMENT_TYPES} onChange={setVehicleDocuments} />
        </SectionCard>

        {/* Actions */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button
            variant="text"
            size="large"
            onClick={() => navigate('/cre/vehicles')}
            sx={{ fontWeight: 700, color: colors.slate[600], borderRadius: '10px' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => void submit()}
            disabled={saving}
            sx={{
              fontWeight: 700,
              px: 4,
              bgcolor: colors.slate[900],
              borderRadius: '10px',
              '&:hover': { bgcolor: colors.slate[800] },
            }}
          >
            {saving ? 'Adding…' : 'Add Vehicle'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
