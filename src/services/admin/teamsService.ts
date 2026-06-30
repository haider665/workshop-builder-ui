import type { CWTeam, CWTeamStatus } from '../../types/cw'
import { workshopApi } from '../workshopApi'

export const teamsService = {
  async list(params: {
    status?: CWTeamStatus
    search?: string
    page?: number
    pageSize?: number
  } = {}): Promise<CWTeam[]> {
    const response = await workshopApi.listTeams(params)
    return response.data
  },

  async create(input: {
    name: string
    seUserId: string
    technicianUserIds: string[]
    status?: CWTeamStatus
  }): Promise<CWTeam> {
    return workshopApi.createTeam(input)
  },

  async update(
    teamId: string,
    input: {
      name: string
      seUserId: string
      technicianUserIds: string[]
      status: CWTeamStatus
    },
  ): Promise<CWTeam> {
    return workshopApi.updateTeam(teamId, input)
  },

  async setStatus(teamId: string, status: CWTeamStatus): Promise<CWTeam> {
    return workshopApi.setTeamStatus(teamId, status)
  },
}
