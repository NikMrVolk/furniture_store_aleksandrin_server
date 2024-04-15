import { UseGuards } from '@nestjs/common'
import { JwtRefreshGuard } from '../guards'

export const Refresh = () => UseGuards(JwtRefreshGuard)
