import { useState } from 'react'
import { Box, InputBase, Stack, Typography } from '@mui/material'
import {
  Store as StoreIcon,
  Garage as GarageIcon,
  People as PeopleIcon,
  Groups as GroupsIcon,
  AdminPanelSettings,
  Category,
  MedicalServices,
  Assignment,
  Assessment,
  Settings,
  Inventory,
  ArrowForward,
  Search,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import type { ReactNode } from 'react'

/* ─────────────────────────── Types ─────────────────────────── */

type ConfigCard = {
  title: string
  desc: string
  to: string
  icon: ReactNode
}

type Section = {
  id: string
  label: string
  cards: ConfigCard[]
  accent: [string, string] // gradient pair
}

/* ─────────────────────── Section Data ─────────────────────── */

const sections: Section[] = [
  {
    id: 'workshop-setup',
    label: 'Workshop Setup',
    accent: ['#6366f1', '#06b6d4'],
    cards: [
      { title: 'Shops', desc: 'Manage workshop locations', to: '/admin/shops', icon: <StoreIcon /> },
      { title: 'Bays', desc: 'Bay configuration', to: '/admin/bays', icon: <GarageIcon /> },
      { title: 'Teams', desc: 'Team assignments', to: '/admin/teams', icon: <GroupsIcon /> },
    ],
  },
  {
    id: 'service-config',
    label: 'Service Configuration',
    accent: ['#10b981', '#14b8a6'],
    cards: [
      { title: 'Services', desc: 'Service catalog', to: '/admin/services', icon: <MedicalServices /> },
      { title: 'Concerns', desc: 'Concern categories', to: '/admin/concerns', icon: <Category /> },
      { title: 'Task Templates', desc: 'Task templates', to: '/admin/task-templates', icon: <Assignment /> },
      { title: 'Parts', desc: 'Parts inventory', to: '/admin/parts', icon: <Inventory /> },
    ],
  },
  {
    id: 'access-settings',
    label: 'Access & Settings',
    accent: ['#f59e0b', '#f97316'],
    cards: [
      { title: 'Users', desc: 'User management', to: '/admin/users', icon: <PeopleIcon /> },
      { title: 'Roles', desc: 'Role permissions', to: '/admin/roles', icon: <AdminPanelSettings /> },
      { title: 'F1 Config', desc: 'F1 configuration', to: '/admin/f1', icon: <Settings /> },
      { title: 'Reports', desc: 'Reports & analytics', to: '/admin/reports', icon: <Assessment /> },
    ],
  },
]

/* ─────────────────────── Motion Tokens ─────────────────────── */

const SPRING_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'
const ENTRY_DURATION = '600ms'
const HOVER_DURATION = '280ms'

const fadeInUp = {
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(24px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
}

const reducedMotion = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none !important',
    transition: 'none !important',
    opacity: '1 !important',
    transform: 'none !important',
  },
}

/* ─────────────────────── Component ─────────────────────────── */

export function AdminHome() {
  const [searchQuery, setSearchQuery] = useState('')
  let globalCardIndex = 0

  const filteredSections = searchQuery.trim()
    ? sections
        .map((section) => ({
          ...section,
          cards: section.cards.filter(
            (card) =>
              card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              card.desc.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        }))
        .filter((section) => section.cards.length > 0)
    : sections

  return (
    <Box
      component="nav"
      aria-label="Admin navigation"
      sx={{
        position: 'relative',
        minHeight: '100vh',
        background: '#F8F9FC',
        overflow: 'hidden',
        ...fadeInUp,
      }}
    >
      {/* ── Gradient Mesh Background ── */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(140px)',
          },
          '&::before': {
            top: '-10%',
            left: '-5%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          },
          '&::after': {
            bottom: '-10%',
            right: '-5%',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          },
        }}
      />
      {/* Third orb */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ── Content ── */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        {/* ── Page Header ── */}
        <Box sx={{ mb: { xs: 3, md: 4 } }}>
          <Typography
            component="h1"
            sx={{
              color: '#0F172A',
              fontSize: { xs: '1.75rem', md: '2rem' },
              fontWeight: 800,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Administration
          </Typography>
          <Typography
            sx={{
              color: '#475569',
              fontSize: '0.9rem',
              mt: 0.75,
              fontWeight: 400,
            }}
          >
            Workshop configuration & management
          </Typography>
          {/* Gradient underline */}
          <Box
            aria-hidden="true"
            sx={{
              mt: 2,
              height: 3,
              width: 80,
              borderRadius: 2,
              background: 'linear-gradient(90deg, #6366f1, #10b981, #f59e0b)',
              opacity: 0.8,
            }}
          />
          {/* Search bar */}
          <InputBase
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={
              <Search sx={{ fontSize: 20, color: '#94a3b8', mr: 1 }} />
            }
            sx={{
              borderRadius: '12px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.06)',
              px: 2,
              py: 1,
              width: { xs: '100%', sm: 320 },
              mt: 2.5,
              fontSize: '0.9rem',
            }}
          />
        </Box>

        {/* ── Sections ── */}
        <Stack spacing={{ xs: 3.5, md: 4.5 }}>
          {filteredSections.map((section) => {
            const [accentA, accentB] = section.accent
            const sectionHeaderId = `section-${section.id}`

            return (
              <Box
                key={section.id}
                component="section"
                aria-labelledby={sectionHeaderId}
              >
                {/* Section eyebrow */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 4,
                      height: 20,
                      borderRadius: 2,
                      background: `linear-gradient(180deg, ${accentA}, ${accentB})`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    id={sectionHeaderId}
                    component="h2"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${accentA}1A, ${accentB}12)`,
                      color: accentA,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                    }}
                  >
                    {section.label}
                  </Typography>
                </Box>

                {/* Card grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gap: { xs: 1.5, md: 2 },
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: '1fr 1fr',
                      md: 'repeat(3, 1fr)',
                    },
                  }}
                >
                  {section.cards.map((card) => {
                    const cardIdx = globalCardIndex++
                    const delay = `${cardIdx * 80}ms`

                    return (
                      <DoubleBezelCard
                        key={card.to}
                        card={card}
                        accentA={accentA}
                        accentB={accentB}
                        animDelay={delay}
                      />
                    )
                  })}
                </Box>
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}

/* ─────────────── Double-Bezel Card Component ─────────────── */

function DoubleBezelCard({
  card,
  accentA,
  accentB,
  animDelay,
}: {
  card: ConfigCard
  accentA: string
  accentB: string
  animDelay: string
}) {
  return (
    /* Outer shell — "the tray" */
    <Box
      sx={{
        borderRadius: '20px',
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderTop: `3px solid ${accentA}`,
        p: '3px',
        animation: `fadeInUp ${ENTRY_DURATION} ${SPRING_EASE} ${animDelay} both`,
        transition: `border-color ${HOVER_DURATION} ${SPRING_EASE}, box-shadow ${HOVER_DURATION} ${SPRING_EASE}`,
        cursor: 'pointer',
        '&:hover': {
          borderColor: `${accentA}80`,
          borderTop: `3px solid ${accentA}`,
          boxShadow: `0 8px 32px ${accentA}20, 0 4px 12px rgba(0,0,0,0.06)`,
          '& .card-inner': {
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px ${accentA}0A`,
          },
          '& .card-icon-box': {
            transform: 'scale(1.1)',
          },
          '& .card-arrow-ring': {
            opacity: 1,
            transform: 'translateX(0)',
            background: `${accentA}12`,
          },
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
        ...reducedMotion,
      }}
    >
      {/* Inner core — "the glass plate" */}
      <Box
        component={RouterLink}
        to={card.to}
        aria-label={`${card.title}: ${card.desc}`}
        className="card-inner"
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          textDecoration: 'none',
          borderRadius: '17px',
          background: 'rgba(255,255,255,0.85)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.03)',
          p: { xs: 2.5, md: 3 },
          height: '100%',
          transition: `box-shadow ${HOVER_DURATION} ${SPRING_EASE}`,
          '&:focus-visible': {
            outline: `2px solid ${accentA}`,
            outlineOffset: '3px',
          },
          ...reducedMotion,
        }}
      >
        <Stack direction="row" spacing={2} sx={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
          {/* Icon container — gradient accent */}
          <Box
            className="card-icon-box"
            aria-hidden="true"
            sx={{
              width: 52,
              height: 52,
              minWidth: 52,
              borderRadius: '15px',
              background: `linear-gradient(135deg, ${accentA}18, ${accentB}10)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `transform ${HOVER_DURATION} ${SPRING_EASE}`,
              '& .MuiSvgIcon-root': {
                fontSize: 24,
                color: accentA,
              },
              ...reducedMotion,
            }}
          >
            {card.icon}
          </Box>

          {/* Text */}
          <Box sx={{ minWidth: 0, pt: 0.25 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '1.05rem',
                color: '#0F172A',
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
              }}
            >
              {card.title}
            </Typography>
            <Typography
              sx={{
                color: '#334155',
                fontSize: '0.85rem',
                mt: 0.5,
                lineHeight: 1.55,
                fontWeight: 450,
              }}
            >
              {card.desc}
            </Typography>
          </Box>
        </Stack>

        {/* Arrow — Button-in-Button pattern */}
        <Box
          className="card-arrow-ring"
          aria-hidden="true"
          sx={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transform: 'translateX(-6px)',
            transition: `all ${HOVER_DURATION} ${SPRING_EASE}`,
            mt: 0.75,
            flexShrink: 0,
            ...reducedMotion,
          }}
        >
          <ArrowForward sx={{ fontSize: 14, color: '#334155' }} />
        </Box>
      </Box>
    </Box>
  )
}
