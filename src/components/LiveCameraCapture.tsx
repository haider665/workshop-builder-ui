import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { CameraAlt, Cameraswitch } from '@mui/icons-material'
import { useEffect, useRef, useState } from 'react'

export function LiveCameraCapture({ onCapture, label = 'Take photo', disabled = false, filenamePrefix = 'workshop-photo' }: {
  onCapture: (file: File) => void | Promise<void>
  label?: string
  disabled?: boolean
  filenamePrefix?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }
  function close() { stop(); setReady(false); setOpen(false) }
  async function start(next = facing) {
    setError(null); setReady(false); stop(); setOpen(true)
    if (!navigator.mediaDevices?.getUserMedia) { setError('Live camera requires a camera-enabled browser over HTTPS.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next }, width: { ideal: 1600 }, height: { ideal: 1200 } }, audio: false })
      streamRef.current = stream
      let attempts = 0
      const attach = () => {
        if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); setReady(true) }
        else if (attempts++ < 20) window.setTimeout(attach, 25)
      }
      attach()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Camera permission was denied or no camera is available.') }
  }
  async function switchCamera() { const next = facing === 'user' ? 'environment' : 'user'; setFacing(next); await start(next) }
  async function capture() {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) { setError('Wait for the live camera preview before capturing.'); return }
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight
    const context = canvas.getContext('2d'); if (!context) return
    if (facing === 'user') { context.translate(canvas.width, 0); context.scale(-1, 1) }
    context.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .9))
    if (!blob) { setError('Unable to prepare the captured image.'); return }
    const file = new File([blob], `${filenamePrefix}-${Date.now()}.jpg`, { type: 'image/jpeg' })
    close(); await onCapture(file)
  }
  useEffect(() => () => stop(), [])
  return <>
    <Button type="button" variant="outlined" startIcon={<CameraAlt />} disabled={disabled} onClick={() => void start()}>{label}</Button>
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Take live photo</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: .5 }}><Typography color="text.secondary" variant="body2">Capture a new image directly from this device. Existing files are not selected.</Typography>{error ? <Alert severity="error">{error}</Alert> : null}<Box sx={{ position:'relative',aspectRatio:'4 / 3',overflow:'hidden',borderRadius:2,bgcolor:'#090d0b',display:'grid',placeItems:'center' }}><video ref={videoRef} autoPlay playsInline muted style={{width:'100%',height:'100%',objectFit:'cover',transform:facing==='user'?'scaleX(-1)':undefined}}/>{!ready&&!error?<Typography sx={{position:'absolute',color:'#fff'}}>Starting camera…</Typography>:null}</Box></Stack></DialogContent>
      <DialogActions sx={{ p:2, pt:0, justifyContent:'space-between', flexWrap:'wrap' }}><Button startIcon={<Cameraswitch />} onClick={() => void switchCamera()}>Switch</Button><Stack direction="row" spacing={1}><Button onClick={close}>Cancel</Button><Button variant="contained" startIcon={<CameraAlt />} disabled={!ready||Boolean(error)} onClick={() => void capture()}>Capture</Button></Stack></DialogActions>
    </Dialog>
  </>
}
