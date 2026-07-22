const fs = require('fs');
const code = fs.readFileSync('src/pages/parts/CounterDeskPage.tsx', 'utf-8');

// We need to add dialog state and imports
let newCode = code.replace(
  "import { useMemo, useState } from 'react'",
  "import { useMemo, useState } from 'react'\nimport { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'"
);

// We need to add state for dialogs
const stateReplacement = `  const [search, setSearch] = useState('')
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null)
  const [photoDialogReqId, setPhotoDialogReqId] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  
  const currentUser = useCwStore((s) => s.currentUser)
  const acknowledgeRequisition = useCwStore((s) => s.acknowledgeRequisition)
  const pickRequisitionLine = useCwStore((s) => s.pickRequisitionLine)
  const collectRequisition = useCwStore((s) => s.collectRequisition)
  const receiveRequisition = useCwStore((s) => s.receiveRequisition)
  const bays = useCwStore((s) => s.bays)
`;

newCode = newCode.replace("  const [search, setSearch] = useState('')", stateReplacement);

// Fix actions in table rows and cards
// Card Review button - replace with actual row click or dialog opening logic
newCode = newCode.replace(/Review<\/Button>/g, "Review</Button>");
// Wait, the Review button should open the dialog.
newCode = newCode.replace(/<Button([\s\S]*?)Review\n\s*<\/Button>/g, `<Button$1onClick={() => setSelectedReqId(card.id)}\n                      >Review</Button>`);

// Action cell replacement in table
const actionCell = `
                        {/* Actions */}
                        <TableCell sx={{ borderBottom: \`1px solid \${colors.border.subtle}\` }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {req.status === 'Sent to Store' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={(e) => { e.stopPropagation(); acknowledgeRequisition(req.id, currentUser!.id); }}
                              >
                                Acknowledge
                              </Button>
                            )}
                            {req.status === 'Request Received' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="info"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fullReq = requisitions.find((r) => r.id === req.id);
                                  fullReq?.lines.forEach((l) => pickRequisitionLine(req.id, l.id, currentUser!.id));
                                }}
                              >
                                Pick Parts
                              </Button>
                            )}
                            {req.status === 'Picked' && !requisitions.find(r => r.id === req.id)?.handoverProofUrl && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={(e) => { e.stopPropagation(); setPhotoDialogReqId(req.id); }}
                              >
                                Hand Over
                              </Button>
                            )}
                            {req.status === 'Picked' && requisitions.find(r => r.id === req.id)?.handoverProofUrl && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const fakePhoto = 'photo://receive/' + Date.now();
                                  receiveRequisition(req.id, fakePhoto);
                                }}
                              >
                                Confirm Received
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
`;

newCode = newCode.replace(
  /<TableCell sx={{ borderBottom: `1px solid \${colors.border.subtle}` }}>\s*<IconButton size="small">\s*<MoreVert sx={{ fontSize: 18, color: colors.slate\[500\] }} \/>\s*<\/IconButton>\s*<\/TableCell>/g,
  actionCell
);

newCode = newCode.replace(/<TableRow\s*key={req.id}\s*sx={{ '&:hover': { bgcolor: colors.bg.cardHover } }}/g, `<TableRow
                        key={req.id}
                        sx={{ '&:hover': { bgcolor: colors.bg.cardHover }, cursor: 'pointer' }}
                        onClick={() => setSelectedReqId(req.id)}`);

// Dialogs at the end
const dialogs = `
        {/* Detail Dialog */}
        <Dialog open={!!selectedReqId} onClose={() => setSelectedReqId(null)} maxWidth="md" fullWidth>
          {(() => {
            const req = requisitions.find((r) => r.id === selectedReqId)
            if (!req) return null
            return (
              <>
                <DialogTitle>Requisition {req.requisitionNumber} Details</DialogTitle>
                <DialogContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Part Name</TableCell>
                          <TableCell>Part Number</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Bay</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {req.lines.map((l) => {
                          const bay = bays.find((b) => b.id === l.bayId)
                          return (
                            <TableRow key={l.id}>
                              <TableCell>{l.partName}</TableCell>
                              <TableCell>{l.partNumber}</TableCell>
                              <TableCell>{l.quantity}</TableCell>
                              <TableCell>{bay?.name || '—'}</TableCell>
                              <TableCell>{l.status}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  {/* Photo Proofs */}
                  {(req.handoverProofUrl || req.receivePhotoUrls?.length) && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Photo Proofs</Typography>
                      <Stack direction="row" spacing={2}>
                        {req.handoverProofUrl && (
                          <Box sx={{ p: 1, border: \`1px solid \${colors.border.default}\`, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Handover</Typography>
                            <Box
                              sx={{
                                width: 80, height: 80, bgcolor: colors.slate[100],
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mt: 0.5, borderRadius: 1
                              }}
                            >
                              📷
                            </Box>
                          </Box>
                        )}
                        {req.receivePhotoUrls?.map((url, i) => (
                          <Box key={i} sx={{ p: 1, border: \`1px solid \${colors.border.default}\`, borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Received</Typography>
                            <Box
                              sx={{
                                width: 80, height: 80, bgcolor: colors.slate[100],
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mt: 0.5, borderRadius: 1
                              }}
                            >
                              📷
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: \`1px solid \${colors.border.default}\` }}>
                  <Button onClick={() => setSelectedReqId(null)}>Close</Button>
                  
                  {req.status === 'Sent to Store' && (
                    <Button variant="outlined" color="success" onClick={() => { acknowledgeRequisition(req.id, currentUser!.id); setSelectedReqId(null); }}>
                      Acknowledge
                    </Button>
                  )}
                  {req.status === 'Request Received' && (
                    <Button variant="contained" color="info" onClick={() => {
                      req.lines.forEach((l) => pickRequisitionLine(req.id, l.id, currentUser!.id));
                      setSelectedReqId(null);
                    }}>
                      Pick Parts
                    </Button>
                  )}
                  {req.status === 'Picked' && !req.handoverProofUrl && (
                    <Button variant="contained" color="warning" onClick={() => { setSelectedReqId(null); setPhotoDialogReqId(req.id); }}>
                      Hand Over
                    </Button>
                  )}
                  {req.status === 'Picked' && req.handoverProofUrl && (
                    <Button variant="contained" color="success" onClick={() => {
                      receiveRequisition(req.id, 'photo://receive/' + Date.now());
                      setSelectedReqId(null);
                    }}>
                      Confirm Received
                    </Button>
                  )}
                </DialogActions>
              </>
            )
          })()}
        </Dialog>

        {/* Photo Capture Dialog */}
        <Dialog open={!!photoDialogReqId} onClose={() => { setPhotoDialogReqId(null); setPhotoFile(null); setPhotoPreview(''); }} maxWidth="sm" fullWidth>
          <DialogTitle>Capture Handover Photo</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    setPhotoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              {photoPreview && (
                <Box
                  component="img"
                  src={photoPreview}
                  sx={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 1 }}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setPhotoDialogReqId(null); setPhotoFile(null); setPhotoPreview(''); }}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!photoFile && !photoPreview}
              onClick={() => {
                if (photoDialogReqId) {
                  collectRequisition(photoDialogReqId, 'photo://handover/' + Date.now());
                }
                setPhotoDialogReqId(null);
                setPhotoFile(null);
                setPhotoPreview('');
              }}
            >
              Submit Photo
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Box>
  )
}
`;

newCode = newCode.replace(/<\/Stack>\s*<\/Box>\s*\)\s*}\s*$/, dialogs);

fs.writeFileSync('src/pages/parts/CounterDeskPage.tsx', newCode);
