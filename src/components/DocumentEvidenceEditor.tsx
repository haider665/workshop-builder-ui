import { Alert, Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { CloudUpload, DeleteOutlined, DescriptionOutlined } from '@mui/icons-material'
import { useState } from 'react'
import { workshopApi } from '../services/workshopApi'
import type { CWDocumentVerificationStatus } from '../types/cw'
import { colors, radii } from '../theme/tokens'
import { LiveCameraCapture } from './LiveCameraCapture'

export type EvidenceDocument<T extends string> = {
  id?: string
  documentType: T
  documentNumber?: string
  fileUrl: string
  verificationStatus: CWDocumentVerificationStatus
  verifiedByUserId?: string
  verifiedAt?: string
  verificationNote?: string
}

export function DocumentEvidenceEditor<T extends string>({ title, documents, documentTypes, onChange, canVerify = true }: {
  title: string
  documents: EvidenceDocument<T>[]
  documentTypes: readonly T[]
  onChange: (documents: EvidenceDocument<T>[]) => void
  canVerify?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(index: number, values: Partial<EvidenceDocument<T>>) {
    onChange(documents.map((document, rowIndex) => rowIndex === index ? { ...document, ...values } : document))
  }

  async function upload(index: number, file: File) {
    try {
      setUploading(true)
      setError(null)
      const result = await workshopApi.uploadFile(file, { folder: 'Home/Workshop/Documents', isPrivate: true })
      update(index, { fileUrl: result.fileUrl })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'File upload failed')
    } finally {
      setUploading(false)
    }
  }

  return <Stack spacing={1.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
      <Box><Typography sx={{ fontWeight: 800 }}>{title}</Typography><Typography sx={{ fontSize: '0.78rem', color: colors.slate[500] }}>Upload evidence, then CRE/Admin can verify or reject it.</Typography></Box>
      <Button variant="outlined" startIcon={<DescriptionOutlined />} onClick={() => onChange([...documents, { documentType: documentTypes[0], fileUrl: '', verificationStatus: 'Pending' }])}>Add document</Button>
    </Stack>
    {error ? <Alert severity="error">{error}</Alert> : null}
    {!documents.length ? <Alert severity="info">No documents added.</Alert> : null}
    {documents.map((document, index) => <Box key={document.id ?? index} sx={{ border: `1px solid ${colors.border.default}`, borderRadius: radii.md, p: 1.5 }}>
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField select size="small" label="Document type" value={document.documentType} onChange={(event) => update(index, { documentType: event.target.value as T })} fullWidth>{documentTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}</TextField>
          <TextField size="small" label="Document number" value={document.documentNumber ?? ''} onChange={(event) => update(index, { documentNumber: event.target.value })} fullWidth />
          <IconButton aria-label="Remove document" onClick={() => onChange(documents.filter((_, rowIndex) => rowIndex !== index))}><DeleteOutlined /></IconButton>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component="label" variant={document.fileUrl ? 'outlined' : 'contained'} startIcon={<CloudUpload />} disabled={uploading}>{document.fileUrl ? 'Replace file' : 'Upload file *'}<input hidden type="file" accept="image/*,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(index, file) }} /></Button>
          <LiveCameraCapture label="Take photo" disabled={uploading} filenamePrefix="document-evidence" onCapture={(file) => upload(index, file)} />
          {document.fileUrl ? <Button component="a" href={document.fileUrl} target="_blank" rel="noreferrer">View file</Button> : null}
          {canVerify ? <TextField select size="small" label="Review status" value={document.verificationStatus} onChange={(event) => update(index, { verificationStatus: event.target.value as CWDocumentVerificationStatus })} sx={{ minWidth: 170 }}><MenuItem value="Pending">Pending review</MenuItem><MenuItem value="Verified">Verified</MenuItem><MenuItem value="Rejected">Rejected</MenuItem></TextField> : null}
        </Stack>
        <TextField size="small" label="Review note" value={document.verificationNote ?? ''} onChange={(event) => update(index, { verificationNote: event.target.value })} multiline minRows={2} fullWidth />
        {document.verifiedByUserId ? <Typography sx={{ fontSize: '0.72rem', color: colors.slate[500] }}>Last reviewed by {document.verifiedByUserId}{document.verifiedAt ? ` on ${new Date(document.verifiedAt).toLocaleString()}` : ''}</Typography> : null}
      </Stack>
    </Box>)}
  </Stack>
}
