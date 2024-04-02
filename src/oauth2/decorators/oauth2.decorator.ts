import { UseGuards } from '@nestjs/common'
import { GoogleGuard } from '../guards/google.guard'
import { YandexGuard } from '../guards/yandex.guard'

export const Google = () => UseGuards(GoogleGuard)
export const Yandex = () => UseGuards(YandexGuard)
