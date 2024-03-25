import { UseGuards } from '@nestjs/common'
import { JwtAccessGuard } from '../guards/access.guard'
import { JwtRefreshGuard } from '../guards/refresh.guard'

export const Access = () => UseGuards(JwtAccessGuard)
export const Refresh = () => UseGuards(JwtRefreshGuard)