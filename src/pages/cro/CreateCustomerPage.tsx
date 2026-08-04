import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  ContactPhone,
  DirectionsCar,
  HomeWork,
  Link as LinkIcon,
  Person,
  Business,
  CorporateFare,
} from '@mui/icons-material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/SectionCard'
import { DocumentEvidenceEditor } from '../../components/DocumentEvidenceEditor'
import { workshopApi } from '../../services/workshopApi'
import { useCwStore } from '../../store/cwStore'
import { useCREData } from '../../hooks/useCREData'
import type { CWCustomerDocument, CWCustomerDocumentType, CWCustomerType } from '../../types/cw'
import { colors, radii } from '../../theme/tokens'

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur', 'Barishal', 'Mymensingh']
const CITIES = ['Dhaka', 'Chattogram', 'Gazipur', 'Narayanganj', 'Comilla', 'Sylhet', 'Rajshahi', 'Khulna', 'Rangpur']
const OCCUPATION_TYPES = ['Business', 'Service', 'Government', 'Student', 'Retired', 'Other']
const CUSTOMER_DOCUMENT_TYPES: CWCustomerDocumentType[] = ['National ID', 'Driving License', 'Passport', 'Tax Identification', 'Trade License', 'Company Registration', 'Other']

type ParentCompanyMode = 'none' | 'existing' | 'new'

export function CreateCustomerPage() {
  const navigate = useNavigate()
  useCREData()
  const [saving, setSaving] = useState(false)
  const vehicles = useCwStore((s) => s.vehicles)

  const [customerType, setCustomerType] = useState<CWCustomerType>('Individual')
  const [error, setError] = useState<string | null>(null)

  // Contact
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  // Address
  const [division, setDivision] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [street, setStreet] = useState('')

  // Occupation (Individual)
  const [occupationType, setOccupationType] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [designation, setDesignation] = useState('')
  const [isSelfDriven, setIsSelfDriven] = useState(true)
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [isPersonalUse, setIsPersonalUse] = useState(true)

  // Vehicle linking
  const [vehicleId, setVehicleId] = useState('')

  // Socials
  const [whatsappLink, setWhatsappLink] = useState('')
  const [facebookLink, setFacebookLink] = useState('')
  const [linkedinLink, setLinkedinLink] = useState('')
  const [googleLink, setGoogleLink] = useState('')
  const [customerDocuments, setCustomerDocuments] = useState<CWCustomerDocument[]>([])

  // Corporate fields
  const [corpNote, setCorpNote] = useState('')
  const [corpSocialMedia, setCorpSocialMedia] = useState('')
  const [parentMode, setParentMode] = useState<ParentCompanyMode>('none')
  const [parentCompanyName, setParentCompanyName] = useState('')
  const [parentDivision, setParentDivision] = useState('')
  const [parentDistrict, setParentDistrict] = useState('')
  const [parentPostalCode, setParentPostalCode] = useState('')
  const [parentAddressLine, setParentAddressLine] = useState('')
  const [transportOfficerName, setTransportOfficerName] = useState('')
  const [transportOfficerPhone, setTransportOfficerPhone] = useState('')
  const [transportOfficerEmail, setTransportOfficerEmail] = useState('')
  const [transportManagerName, setTransportManagerName] = useState('')
  const [transportManagerPhone, setTransportManagerPhone] = useState('')
  const [transportManagerEmail, setTransportManagerEmail] = useState('')

  async function handleSubmit() {
    try {
      setError(null)
      setSaving(true)
      if (!fullName.trim()) throw new Error('Name is required')
      if (!phone.trim()) throw new Error('Phone number is required')

      const created = await workshopApi.createCustomer({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        type: customerType,
        address: (division || city || postalCode || street)
          ? { division, city, postalCode, street }
          : undefined,
        occupation: customerType === 'Individual' && (occupationType || companyName || designation)
          ? { type: occupationType, companyName, designation }
          : undefined,
        isSelfDriven,
        driverName: !isSelfDriven ? driverName.trim() || undefined : undefined,
        driverPhone: !isSelfDriven ? driverPhone.trim() || undefined : undefined,
        isPersonalUse,
        whatsappLink: whatsappLink.trim() || undefined,
        facebookLink: facebookLink.trim() || undefined,
        linkedinLink: linkedinLink.trim() || undefined,
        googleLink: googleLink.trim() || undefined,
        corporate: customerType === 'Corporate'
          ? {
              note: corpNote.trim() || undefined,
              socialMedia: corpSocialMedia.trim() || undefined,
              parentCompanyName: parentMode !== 'none' ? parentCompanyName.trim() : undefined,
              parentCompanyAddress: parentMode === 'new'
                ? { division: parentDivision, city: parentDistrict, postalCode: parentPostalCode, street: parentAddressLine }
                : undefined,
              transportOfficerName: transportOfficerName.trim() || undefined,
              transportOfficerPhone: transportOfficerPhone.trim() || undefined,
              transportOfficerEmail: transportOfficerEmail.trim() || undefined,
              transportManagerName: transportManagerName.trim() || undefined,
              transportManagerPhone: transportManagerPhone.trim() || undefined,
              transportManagerEmail: transportManagerEmail.trim() || undefined,
            }
          : undefined,
        customerDocuments,
      })
      // Push into store so list updates immediately
      useCwStore.setState((s) => ({ customers: [created, ...s.customers] }))

      navigate('/cre/customers')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
      <Stack spacing={3.5}>
        {/* Header */}
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/cre/customers')}
            sx={{ border: `1px solid ${colors.border.default}`, borderRadius: '10px' }}
          >
            <ArrowBack sx={{ fontSize: '1.1rem', color: colors.slate[600] }} />
          </IconButton>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.slate[900], letterSpacing: '-0.02em' }}>
              New Customer
            </Typography>
            <Typography sx={{ color: colors.slate[500], fontSize: '0.875rem' }}>Create new customer from here</Typography>
          </Box>
        </Stack>

        {/* Type toggle */}
        <ToggleButtonGroup
          value={customerType}
          exclusive
          onChange={(_, v) => v && setCustomerType(v as CWCustomerType)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              borderRadius: radii.sm,
              fontSize: '0.85rem',
              '&.Mui-selected': {
                bgcolor: colors.slate[900],
                color: '#fff',
                '&:hover': { bgcolor: colors.slate[800] },
              },
            },
          }}
        >
          <ToggleButton value="Individual">Individual</ToggleButton>
          <ToggleButton value="Corporate">Corporate</ToggleButton>
        </ToggleButtonGroup>

        {error && (
          <Box sx={{
            p: 2,
            bgcolor: '#FEF2F2',
            border: `1px solid ${colors.status.error}`,
            borderRadius: radii.sm,
          }}>
            <Typography sx={{ color: colors.status.error, fontWeight: 700, fontSize: '0.85rem' }}>{error}</Typography>
          </Box>
        )}

        {/* ── Individual Flow ── */}
        {customerType === 'Individual' && (
          <>
            {/* Contact */}
            <SectionCard title="Contact" icon={<ContactPhone sx={{ fontSize: '1rem' }} />}>
              <Stack spacing={2} sx={{ py: 1 }}>
                <TextField
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  fullWidth
                  required
                />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    value="+880"
                    disabled
                    sx={{ width: 80 }}
                    size="small"
                  />
                  <TextField
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    required
                  />
                </Stack>
                <TextField
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  type="email"
                />
              </Stack>
            </SectionCard>

            {/* Address */}
            <SectionCard title="Address" icon={<HomeWork sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Stack spacing={2} sx={{ py: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Division</InputLabel>
                  <Select value={division} label="Division" onChange={(e) => setDivision(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {DIVISIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>City</InputLabel>
                  <Select value={city} label="City" onChange={(e) => setCity(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {CITIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Postal Code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} fullWidth />
                <TextField label="Street Address" value={street} onChange={(e) => setStreet(e.target.value)} fullWidth />
              </Stack>
            </SectionCard>

            {/* Occupation */}
            <SectionCard title="Occupation" icon={<Person sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Stack spacing={2} sx={{ py: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Occupation Type</InputLabel>
                  <Select value={occupationType} label="Occupation Type" onChange={(e) => setOccupationType(e.target.value)}>
                    <MenuItem value="">—</MenuItem>
                    {OCCUPATION_TYPES.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} fullWidth />
                <TextField label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} fullWidth />
              </Stack>
            </SectionCard>

            <SectionCard title="Driving and Usage" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Stack spacing={2} sx={{ py: 1 }}>
                <FormControlLabel control={<Switch checked={isSelfDriven} onChange={(e) => setIsSelfDriven(e.target.checked)} />} label={isSelfDriven ? 'Customer drives the vehicle' : 'A separate driver is used'} />
                {!isSelfDriven ? <><TextField label="Driver full name" value={driverName} onChange={(e) => setDriverName(e.target.value)} fullWidth /><TextField label="Driver phone number" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} fullWidth /></> : null}
                <FormControlLabel control={<Switch checked={isPersonalUse} onChange={(e) => setIsPersonalUse(e.target.checked)} />} label={isPersonalUse ? 'Personal use' : 'Corporate / commercial use'} />
              </Stack>
            </SectionCard>

            {/* Vehicle */}
            <SectionCard title="Vehicle" icon={<DirectionsCar sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Box sx={{ py: 1 }}>
                <FormControl fullWidth>
                  <InputLabel>Vehicle</InputLabel>
                  <Select value={vehicleId} label="Vehicle" onChange={(e) => setVehicleId(e.target.value)}>
                    <MenuItem value="">— None —</MenuItem>
                    {vehicles.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.make} {v.model} · {v.registrationNo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </SectionCard>

            {/* Socials */}
            <SectionCard title="Socials" icon={<LinkIcon sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Stack spacing={2} sx={{ py: 1 }}>
                <TextField label="WhatsApp Link" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} fullWidth placeholder="https://wa.me/..." />
                <TextField label="Facebook Link" value={facebookLink} onChange={(e) => setFacebookLink(e.target.value)} fullWidth />
                <TextField label="LinkedIn Link" value={linkedinLink} onChange={(e) => setLinkedinLink(e.target.value)} fullWidth />
                <TextField label="Google Link" value={googleLink} onChange={(e) => setGoogleLink(e.target.value)} fullWidth />
              </Stack>
            </SectionCard>
          </>
        )}

        {/* ── Corporate Flow ── */}
        {customerType === 'Corporate' && (
          <>
            {/* General Information */}
            <SectionCard title="General Information" icon={<Business sx={{ fontSize: '1rem' }} />}>
              <Stack spacing={2} sx={{ py: 1 }}>
                <TextField label="Name" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth required />
                <TextField label="Note" value={corpNote} onChange={(e) => setCorpNote(e.target.value)} fullWidth placeholder="e.g. VIP" />
                <TextField label="Social Media" value={corpSocialMedia} onChange={(e) => setCorpSocialMedia(e.target.value)} fullWidth placeholder="WhatsApp" />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField value="+880" disabled sx={{ width: 80 }} size="small" />
                  <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth required />
                </Stack>
                <TextField label="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth type="email" />
              </Stack>
            </SectionCard>

            {/* Parent Company */}
            <SectionCard title="Parent Company" icon={<CorporateFare sx={{ fontSize: '1rem' }} />} defaultCollapsed>
              <Stack spacing={2} sx={{ py: 1 }}>
                <RadioGroup
                  row
                  value={parentMode}
                  onChange={(e) => setParentMode(e.target.value as ParentCompanyMode)}
                >
                  <FormControlLabel value="none" control={<Radio />} label="No Parent" />
                  <FormControlLabel value="existing" control={<Radio />} label="Existing Company" />
                  <FormControlLabel value="new" control={<Radio />} label="New Company" />
                </RadioGroup>

                {parentMode !== 'none' && (
                  <TextField
                    label="Parent Company Name"
                    value={parentCompanyName}
                    onChange={(e) => setParentCompanyName(e.target.value)}
                    fullWidth
                  />
                )}

                {parentMode === 'new' && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 1, color: colors.slate[700] }}>Parent Company Address</Typography>
                    <Stack direction="row" spacing={2}>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>Division</InputLabel>
                        <Select value={parentDivision} label="Division" onChange={(e) => setParentDivision(e.target.value)}>
                          <MenuItem value="">—</MenuItem>
                          {DIVISIONS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControl sx={{ flex: 1 }}>
                        <InputLabel>District</InputLabel>
                        <Select value={parentDistrict} label="District" onChange={(e) => setParentDistrict(e.target.value)}>
                          <MenuItem value="">—</MenuItem>
                          {CITIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Postal Code"
                        value={parentPostalCode}
                        onChange={(e) => setParentPostalCode(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                    <TextField
                      label="Address Line"
                      value={parentAddressLine}
                      onChange={(e) => setParentAddressLine(e.target.value)}
                      fullWidth
                      placeholder="Block A, House, 57 Road No. 25, Dhaka 1213"
                    />
                  </>
                )}

                <Divider />

                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.slate[700] }}>Parent Company Transport Officer</Typography>
                <TextField label="Name" value={transportOfficerName} onChange={(e) => setTransportOfficerName(e.target.value)} fullWidth />
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                    <TextField value="+880" disabled sx={{ width: 80 }} size="small" />
                    <TextField label="Phone Number" value={transportOfficerPhone} onChange={(e) => setTransportOfficerPhone(e.target.value)} fullWidth />
                  </Stack>
                  <TextField label="Email" value={transportOfficerEmail} onChange={(e) => setTransportOfficerEmail(e.target.value)} sx={{ flex: 1 }} />
                </Stack>

                <Divider />

                <Typography variant="body2" sx={{ fontWeight: 700, color: colors.slate[700] }}>Transport Manager Information</Typography>
                <TextField label="Name" value={transportManagerName} onChange={(e) => setTransportManagerName(e.target.value)} fullWidth />
                <Stack direction="row" spacing={2}>
                  <Stack direction="row" spacing={1} sx={{ flex: 1, alignItems: 'center' }}>
                    <TextField value="+880" disabled sx={{ width: 80 }} size="small" />
                    <TextField label="Phone Number" value={transportManagerPhone} onChange={(e) => setTransportManagerPhone(e.target.value)} fullWidth />
                  </Stack>
                  <TextField label="Email" value={transportManagerEmail} onChange={(e) => setTransportManagerEmail(e.target.value)} sx={{ flex: 1 }} />
                </Stack>
              </Stack>
            </SectionCard>
          </>
        )}

        <SectionCard title="Customer Papers" icon={<ContactPhone sx={{ fontSize: '1rem' }} />} defaultCollapsed>
          <DocumentEvidenceEditor title="Identity and compliance documents" documents={customerDocuments} documentTypes={CUSTOMER_DOCUMENT_TYPES} onChange={setCustomerDocuments} />
        </SectionCard>

        {/* Actions */}
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate('/cre/customers')}
            sx={{ fontWeight: 700, borderRadius: '10px', borderColor: colors.border.strong, color: colors.slate[700], '&:hover': { borderColor: colors.slate[400] } }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => void handleSubmit()}
            disabled={saving}
            sx={{ fontWeight: 900, px: 4, bgcolor: colors.slate[900], borderRadius: '10px', '&:hover': { bgcolor: colors.slate[800] } }}
          >
            {saving ? 'Adding…' : 'Add Customer'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}
