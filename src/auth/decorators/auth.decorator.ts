import { UseGuards } from '@nestjs/common'
import { JwtAccessGuard } from '../guards/access.guard'
import { JwtRefreshGuard } from '../guards/refresh.guard'
import { JwtAdminGuard } from '../guards/admin.guard'

export const Access = () => UseGuards(JwtAccessGuard)
export const Refresh = () => UseGuards(JwtRefreshGuard)
export const Admin = () => UseGuards(JwtAdminGuard)
