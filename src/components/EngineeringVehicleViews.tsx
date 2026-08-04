import {
  CenterFocusStrongRounded,
  CheckCircleRounded,
  ErrorRounded,
  ReportProblemRounded,
  ThreeDRotationRounded,
} from '@mui/icons-material'
import { Box, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CWInspectionCheck, CWVehicle, CWVehicleCategory } from '../types/cw'

type Props = {
  checks: CWInspectionCheck[]
  onOpenCategory: (category: string) => void
  vehicle?: CWVehicle | null
}

const BODY_TYPES: CWVehicleCategory[] = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Van', 'Truck', 'Bus', 'Other']

const CAMERA_VIEWS = [
  { id: 'perspective', label: '3D', position: [8, 5, 9] },
  { id: 'front', label: 'Front', position: [9, 2.6, 0] },
  { id: 'right', label: 'Right', position: [0, 2.6, 10] },
  { id: 'rear', label: 'Rear', position: [-9, 2.6, 0] },
  { id: 'left', label: 'Left', position: [0, 2.6, -10] },
  { id: 'top', label: 'Top', position: [0.01, 11, 0.01] },
  { id: 'under', label: 'Under', position: [0.01, -8, 6] },
] as const

const PART_COLORS: Record<string, number> = {
  'Front View': 0x38bdf8,
  'Rear View': 0xf97316,
  'Left View': 0x22c55e,
  'Right View': 0x14b8a6,
  'Interior View': 0xa855f7,
  'System Component': 0x8b5cf6,
  'Scheduled Maintenance': 0xeab308,
  'Tyre/Brake Wire': 0xef4444,
  Underbody: 0x64748b,
}

function statusFor(items: CWInspectionCheck[]) {
  if (items.some((item) => item.condition === 'Bad' || item.result === 'Fail')) return 'error' as const
  if (items.some((item) => item.condition === 'Warning' || item.result === 'Advisory')) return 'warning' as const
  if (items.length > 0 && items.every((item) => item.checked)) return 'success' as const
  return 'default' as const
}

export function EngineeringVehicleViews({ checks, onOpenCategory, vehicle }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const callbackRef = useRef(onOpenCategory)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [hoveredPart, setHoveredPart] = useState<string | null>(null)
  const [activeCamera, setActiveCamera] = useState('perspective')
  const [bodyType, setBodyType] = useState<CWVehicleCategory>(vehicle?.vehicleCategory ?? 'Sedan')

  useEffect(() => {
    callbackRef.current = onOpenCategory
  }, [onOpenCategory])

  const selectedChecks = useMemo(
    () => checks.filter((check) => check.category === selectedCategory),
    [checks, selectedCategory],
  )
  const selectedStatus = statusFor(selectedChecks)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x07111f)
    scene.fog = new THREE.Fog(0x07111f, 13, 24)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(8, 5, 9)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.enablePan = false
    controls.minDistance = 6
    controls.maxDistance = 17
    controls.maxPolarAngle = Math.PI * 0.92
    controls.target.set(0, 0.75, 0)

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x172033, 2.4))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2)
    keyLight.position.set(6, 10, 7)
    keyLight.castShadow = true
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 2)
    rimLight.position.set(-7, 4, -6)
    scene.add(rimLight)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8.5, 64),
      new THREE.MeshStandardMaterial({ color: 0x0f1b2d, roughness: 0.9, metalness: 0.1 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.12
    floor.receiveShadow = true
    scene.add(floor)

    const grid = new THREE.GridHelper(16, 24, 0x334155, 0x1e293b)
    grid.position.y = -1.1
    scene.add(grid)

    const car = new THREE.Group()
    car.rotation.y = -0.16
    const bodyScale: Record<CWVehicleCategory, [number, number, number]> = {
      Sedan: [1, 1, 1],
      SUV: [1.04, 1.2, 1.08],
      Hatchback: [.9, 1.06, 1],
      Pickup: [1.12, 1.06, 1.04],
      Van: [1.08, 1.3, 1.08],
      Truck: [1.22, 1.38, 1.16],
      Bus: [1.38, 1.52, 1.2],
      Other: [1, 1, 1],
    }
    car.scale.set(...bodyScale[bodyType])
    scene.add(car)
    const selectable: THREE.Mesh[] = []

    function material(category: string, options?: { transparent?: boolean; opacity?: number }) {
      return new THREE.MeshPhysicalMaterial({
        color: PART_COLORS[category] ?? 0x94a3b8,
        metalness: category === 'Tyre/Brake Wire' ? 0.1 : 0.55,
        roughness: 0.28,
        clearcoat: 0.65,
        clearcoatRoughness: 0.2,
        transparent: options?.transparent,
        opacity: options?.opacity ?? 1,
      })
    }

    function part(
      geometry: THREE.BufferGeometry,
      position: [number, number, number],
      category: string,
      label: string,
      options?: { rotation?: [number, number, number]; transparent?: boolean; opacity?: number },
    ) {
      const mesh = new THREE.Mesh(geometry, material(category, options))
      mesh.position.set(...position)
      if (options?.rotation) mesh.rotation.set(...options.rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.category = category
      mesh.userData.label = label
      car.add(mesh)
      selectable.push(mesh)
      return mesh
    }

    part(new THREE.BoxGeometry(6.8, 0.62, 2.35), [0, 0, 0], 'Underbody', 'Chassis and floor')
    part(new THREE.BoxGeometry(2.15, 0.58, 2.28), [2.22, 0.57, 0], 'Front View', 'Bonnet and front structure')
    part(new THREE.BoxGeometry(1.55, 0.55, 2.26), [-2.63, 0.52, 0], 'Rear View', 'Boot and rear structure')
    part(new THREE.BoxGeometry(2.95, 1.22, 2.08), [-0.25, 1.12, 0], 'Interior View', 'Cabin and controls', { transparent: true, opacity: 0.72 })
    part(new THREE.BoxGeometry(2.75, 0.82, 0.16), [-0.2, 0.55, 1.24], 'Right View', 'Right body and doors')
    part(new THREE.BoxGeometry(2.75, 0.82, 0.16), [-0.2, 0.55, -1.24], 'Left View', 'Left body and doors')
    part(new THREE.BoxGeometry(1.35, 0.45, 1.45), [2.2, 0.92, 0], 'System Component', 'Engine and powertrain')
    part(new THREE.CylinderGeometry(0.23, 0.23, 0.55, 24), [1.72, 1.28, -0.6], 'Scheduled Maintenance', 'Fluid and maintenance points')
    part(new THREE.BoxGeometry(0.22, 0.3, 1.65), [3.48, 0.28, 0], 'Front View', 'Front bumper and lighting')
    part(new THREE.BoxGeometry(0.22, 0.3, 1.65), [-3.48, 0.25, 0], 'Rear View', 'Rear bumper and lighting')

    const wheelPositions: Array<[number, number, number]> = [
      [2.15, -0.35, 1.34], [2.15, -0.35, -1.34], [-2.25, -0.35, 1.34], [-2.25, -0.35, -1.34],
    ]
    wheelPositions.forEach((position, index) => {
      const wheel = part(
        new THREE.CylinderGeometry(0.62, 0.62, 0.38, 32),
        position,
        'Tyre/Brake Wire',
        'Wheel, tyre and brake ' + (index + 1),
        { rotation: [Math.PI / 2, 0, 0] },
      )
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.4, 24),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.22 }),
      )
      hub.rotation.x = Math.PI / 2
      wheel.add(hub)
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerStart = { x: 0, y: 0 }

    function intersections(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(selectable, false)
    }

    function onPointerDown(event: PointerEvent) {
      pointerStart = { x: event.clientX, y: event.clientY }
    }

    function onPointerMove(event: PointerEvent) {
      const hit = intersections(event)[0]
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
      setHoveredPart(hit ? String(hit.object.userData.label ?? '') : null)
    }

    function onPointerUp(event: PointerEvent) {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return
      const hit = intersections(event)[0]
      if (!hit) return
      const category = String(hit.object.userData.category ?? '')
      setSelectedCategory(category)
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(host.clientWidth, 1)
      const height = Math.max(host.clientHeight, 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    })
    resizeObserver.observe(host)

    let animationFrame = 0
    function animate() {
      animationFrame = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      renderer.dispose()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose())
          else object.material.dispose()
        }
      })
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
      cameraRef.current = null
      controlsRef.current = null
    }
  }, [bodyType])

  function moveCamera(view: (typeof CAMERA_VIEWS)[number]) {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    camera.position.set(view.position[0], view.position[1], view.position[2])
    controls.target.set(0, 0.7, 0)
    controls.update()
    setActiveCamera(view.id)
  }

  return (
    <Paper
      variant="outlined"
      sx={{ overflow: 'hidden', borderRadius: { xs: 2.5, md: 3.5 }, bgcolor: '#07111f', color: '#fff', borderColor: 'rgba(148,163,184,.25)' }}
    >
      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, borderBottom: '1px solid rgba(148,163,184,.16)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <ThreeDRotationRounded sx={{ color: '#60a5fa' }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 850, fontSize: { xs: '.9rem', sm: '1rem' } }}>Interactive 3D vehicle</Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: '.7rem' }}>Drag to rotate · pinch or scroll to zoom · tap a component</Typography>
        </Box>
        <Chip label="LIVE 3D" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: 'rgba(37,99,235,.22)', color: '#bfdbfe', fontWeight: 800, fontSize: '.62rem' }} />
      </Box>

      <Box sx={{ px: { xs: 1.25, sm: 2.5 }, py: 1.15, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, gap: 1, borderBottom: '1px solid rgba(148,163,184,.12)' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 750, fontSize: '.75rem' }}>
            {[vehicle?.make, vehicle?.model, vehicle?.modelVariant].filter(Boolean).join(' ') || 'Generic vehicle'}
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '.64rem' }}>
            {[vehicle?.modelYear, vehicle?.registrationNo].filter(Boolean).join(' · ') || 'Choose the closest body type'}
          </Typography>
        </Box>
        <TextField
          select
          size="small"
          value={bodyType}
          onChange={(event) => setBodyType(event.target.value as CWVehicleCategory)}
          aria-label="Vehicle body type"
          sx={{ width: { xs: '100%', sm: 150 }, '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,.08)', color: '#fff' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,.3)' }, '& .MuiSvgIcon-root': { color: '#94a3b8' } }}
        >
          {BODY_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
        </TextField>
      </Box>

      <Stack direction="row" sx={{ px: 1.25, py: 1, gap: 0.65, overflowX: 'auto', borderBottom: '1px solid rgba(148,163,184,.12)', scrollbarWidth: 'none' }}>
        {CAMERA_VIEWS.map((view) => (
          <Button
            key={view.id}
            size="small"
            variant={activeCamera === view.id ? 'contained' : 'text'}
            onClick={() => moveCamera(view)}
            startIcon={view.id === 'perspective' ? <CenterFocusStrongRounded /> : undefined}
            sx={{ flexShrink: 0, minWidth: 0, color: activeCamera === view.id ? '#fff' : '#94a3b8', textTransform: 'none', borderRadius: 99, fontSize: '.7rem' }}
          >
            {view.label}
          </Button>
        ))}
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <Box ref={hostRef} sx={{ height: { xs: 350, sm: 460, lg: 520 }, width: '100%' }} />
        {hoveredPart && (
          <Box sx={{ pointerEvents: 'none', position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', bgcolor: 'rgba(2,6,23,.88)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 99, px: 1.5, py: 0.65, backdropFilter: 'blur(12px)' }}>
            <Typography sx={{ fontSize: '.72rem', fontWeight: 750 }}>{hoveredPart}</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, minHeight: 72, borderTop: '1px solid rgba(148,163,184,.14)', bgcolor: 'rgba(2,6,23,.7)' }}>
        {!selectedCategory ? (
          <Typography sx={{ color: '#94a3b8', fontSize: '.75rem' }}>Select any highlighted vehicle component to begin its inspection.</Typography>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1.25 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                {selectedStatus === 'success' && <CheckCircleRounded color="success" fontSize="small" />}
                {selectedStatus === 'warning' && <ReportProblemRounded color="warning" fontSize="small" />}
                {selectedStatus === 'error' && <ErrorRounded color="error" fontSize="small" />}
                <Typography sx={{ fontWeight: 800, fontSize: '.82rem' }}>{selectedCategory.replace(' View', '')}</Typography>
              </Stack>
              <Typography sx={{ color: '#94a3b8', fontSize: '.68rem', mt: 0.25 }}>
                {selectedChecks.filter((item) => item.checked).length} of {selectedChecks.length} checks completed
              </Typography>
            </Box>
            <Button variant="contained" onClick={() => callbackRef.current(selectedCategory)} sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 750 }}>
              Inspect component
            </Button>
          </Stack>
        )}
      </Box>
    </Paper>
  )
}
