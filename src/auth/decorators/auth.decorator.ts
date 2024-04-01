import { UseGuards } from '@nestjs/common'
import { JwtAccessGuard } from '../guards/access.guard'
import { JwtRefreshGuard } from '../guards/refresh.guard'
import { JwtAdminGuard } from '../guards/admin.guard'
import { GoogleGuard } from '../guards/google.guard'
import { YandexGuard } from '../guards/yandex.guard'

export const Access = () => UseGuards(JwtAccessGuard)
export const Refresh = () => UseGuards(JwtRefreshGuard)
export const Admin = () => UseGuards(JwtAdminGuard)
export const Google = () => UseGuards(GoogleGuard)
export const Yandex = () => UseGuards(YandexGuard)
