import { UseGuards } from '@nestjs/common'
import { JwtAccessGuard } from '../guards'

export const Access = () => UseGuards(JwtAccessGuard)
