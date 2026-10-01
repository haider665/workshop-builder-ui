import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { CWUser } from '../types/cw'

type PresenceAutocompleteProps = {
  label: string
  users: CWUser[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  sx?: SxProps<Theme>
  roleNames?: Map<string, string>
}

type PresenceMultiAutocompleteProps = Omit<PresenceAutocompleteProps, 'value' | 'onChange'> & {
  value: string[]
  onChange: (ids: string[]) => void
}

/** Searchable assignee picker shared by every workshop role. Presence is
 * refreshed by RealtimeNotifications and is deliberately shown in the list,
 * not used as a hard filter (offline users can still be scheduled). */
export function PresenceAutocomplete({ label, users, value, onChange, disabled, sx, roleNames }: PresenceAutocompleteProps) {
  const selected = users.find((user) => user.id === value) ?? null
  return (
    <Autocomplete<CWUser>
      fullWidth
      size="small"
      disabled={disabled}
      options={users}
      value={selected}
      onOpen={() => window.dispatchEvent(new CustomEvent('cw:presence-refresh'))}
      onChange={(_, next) => onChange(next?.id ?? '')}
      isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id}
      getOptionLabel={(user) => user.fullName || user.email || user.id}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLocaleLowerCase()
        if (!query) return options
        return options.filter((user) => [user.fullName, user.email, user.mobile, user.id, ...(user.roleIds ?? []).map((id) => roleNames?.get(id) ?? id)]
          .filter(Boolean).some((field) => String(field).toLocaleLowerCase().includes(query)))
      }}
      renderOption={(props, user) => (
        <Box component="li" {...props} key={user.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" noWrap>{user.fullName || user.email}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {[...(user.roleIds ?? []).map((id) => roleNames?.get(id) ?? id), user.email, user.mobile].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <Chip size="small" label={user.online ? 'Online' : 'Offline'} color={user.online ? 'success' : 'default'} variant={user.online ? 'filled' : 'outlined'} />
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} placeholder="Search by name, email or phone" />}
      sx={sx}
    />
  )
}

export function PresenceMultiAutocomplete({ label, users, value, onChange, disabled, sx }: PresenceMultiAutocompleteProps) {
  const selected = users.filter((user) => value.includes(user.id))
  return (
    <Autocomplete<CWUser, true, false, false>
      multiple
      fullWidth
      size="small"
      disabled={disabled}
      options={users}
      value={selected}
      onOpen={() => window.dispatchEvent(new CustomEvent('cw:presence-refresh'))}
      onChange={(_, next) => onChange(next.map((user) => user.id))}
      isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id}
      getOptionLabel={(user) => user.fullName || user.email || user.id}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLocaleLowerCase()
        if (!query) return options
        return options.filter((user) => [user.fullName, user.email, user.mobile, user.id]
          .filter(Boolean).some((field) => String(field).toLocaleLowerCase().includes(query)))
      }}
      renderOption={(props, user) => (
        <Box component="li" {...props} key={user.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>{user.fullName || user.email}</Typography>
          <Chip size="small" label={user.online ? 'Online' : 'Offline'} color={user.online ? 'success' : 'default'} variant={user.online ? 'filled' : 'outlined'} />
        </Box>
      )}
      renderInput={(params) => <TextField {...params} label={label} placeholder="Search by name, email or phone" />}
      sx={sx}
    />
  )
}
