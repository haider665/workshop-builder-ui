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
import { useState } from 'react'
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
  accent: [string, string]
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
const HOVER_DURATION = '220ms'

const fadeInUp = {
  '@keyframes fadeInUp': {
    from: { opacity: 0, transform: 'translateY(20px)' },
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
  const [search, setSearch] = useState('')
  const query = search.toLowerCase()

  const filteredSections = sections
    .map((s) => ({
      ...s,
      cards: query
        ? s.cards.filter(
            (c) =>
              c.title.toLowerCase().includes(query) ||
              c.desc.toLowerCase().includes(query),
          )
        : s.cards,
    }))
    .filter((s) => s.cards.length > 0)

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
          {/* Search */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.06)',
                px: 2,
                py: 1,
                width: { xs: '100%', sm: 320 },
                transition: `border-color 200ms ${SPRING_EASE}`,
                '&:focus-within': {
                  borderColor: 'rgba(0,0,0,0.15)',
                },
              }}
            >
              <Search sx={{ fontSize: 20, color: '#94A3B8' }} />
              <InputBase
                placeholder="Search settings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  flex: 1,
                  fontSize: '0.875rem',
                  color: '#0F172A',
                  '& input::placeholder': { color: '#94A3B8', opacity: 1 },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* ── Section Cards ── */}
        <Stack spacing={{ xs: 2.5, md: 3 }}>
          {filteredSections.map((section, sectionIdx) => {
            const [accentA, accentB] = section.accent
            const sectionHeaderId = `section-${section.id}`

            return (
              <Box
                key={section.id}
                component="section"
                aria-labelledby={sectionHeaderId}
                sx={{
                  borderRadius: '16px',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderLeft: '4px solid #0F172A',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  animation: `fadeInUp ${ENTRY_DURATION} ${SPRING_EASE} ${sectionIdx * 100}ms both`,
                  ...reducedMotion,
                }}
              >
                {/* Section Header */}
                <Box
                  sx={{
                    px: { xs: 2.5, md: 3 },
                    pt: { xs: 2, md: 2.5 },
                    pb: 1,
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${accentA}, ${accentB})`,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    id={sectionHeaderId}
                    component="h2"
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {section.label}
                  </Typography>
                </Box>

                {/* Items Grid */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: '1fr 1fr',
                      md: 'repeat(3, 1fr)',
                    },
                  }}
                >
                  {section.cards.map((card, cardIdx) => (
                    <SectionItem
                      key={card.to}
                      card={card}
                      accentA={accentA}
                      accentB={accentB}
                      isLastRow={cardIdx >= section.cards.length - (section.cards.length % 3 || 3)}
                      colIndex={cardIdx % 3}
                    />
                  ))}
                </Box>
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}

/* ─────────────── Section Item Component ─────────────────────── */

function SectionItem({
  card,
  accentA,
  accentB,
  isLastRow,
  colIndex,
}: {
  card: ConfigCard
  accentA: string
  accentB: string
  isLastRow: boolean
  colIndex: number
}) {
  return (
    <Box
      component={RouterLink}
      to={card.to}
      aria-label={`${card.title}: ${card.desc}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textDecoration: 'none',
        px: { xs: 2.5, md: 3 },
        py: { xs: 2, md: 2.25 },
        borderBottom: isLastRow ? 'none' : '1px solid rgba(0,0,0,0.04)',
        borderRight: {
          xs: 'none',
          md: colIndex < 2 ? '1px solid rgba(0,0,0,0.04)' : 'none',
        },
        transition: `background ${HOVER_DURATION} ${SPRING_EASE}`,
        cursor: 'pointer',
        '&:hover': {
          background: `linear-gradient(135deg, ${accentA}08, ${accentB}05)`,
          '& .item-arrow': {
            opacity: 1,
            transform: 'translateX(0)',
          },
          '& .item-icon-box': {
            transform: 'scale(1.08)',
          },
        },
        '&:focus-visible': {
          outline: `2px solid ${accentA}`,
          outlineOffset: '-2px',
          borderRadius: '4px',
        },
        ...reducedMotion,
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
        {/* Icon */}
        <Box
          className="item-icon-box"
          aria-hidden="true"
          sx={{
            width: 44,
            height: 44,
            minWidth: 44,
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${accentA}14, ${accentB}0C)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: `transform ${HOVER_DURATION} ${SPRING_EASE}`,
            '& .MuiSvgIcon-root': {
              fontSize: 22,
              color: '#0F172A',
            },
            ...reducedMotion,
          }}
        >
          {card.icon}
        </Box>

        {/* Text */}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: '#0F172A',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {card.title}
          </Typography>
          <Typography
            sx={{
              color: '#64748B',
              fontSize: '0.8rem',
              mt: 0.25,
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            {card.desc}
          </Typography>
        </Box>
      </Stack>

      {/* Arrow */}
      <ArrowForward
        className="item-arrow"
        aria-hidden="true"
        sx={{
          fontSize: 16,
          color: '#94A3B8',
          opacity: 0,
          transform: 'translateX(-4px)',
          transition: `all ${HOVER_DURATION} ${SPRING_EASE}`,
          flexShrink: 0,
          ml: 1,
          ...reducedMotion,
        }}
      />
    </Box>
  )
}
