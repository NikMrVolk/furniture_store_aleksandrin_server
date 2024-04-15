import { UseGuards } from '@nestjs/common'
import { JwtAdminGuard } from '../guards'

export const Admin = () => UseGuards(JwtAdminGuard)
