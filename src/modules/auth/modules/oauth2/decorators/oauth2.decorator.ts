import { UseGuards } from '@nestjs/common'
import { GoogleGuard, MailruGuard, YandexGuard } from '../guards'

export const Google = () => UseGuards(GoogleGuard)
export const Yandex = () => UseGuards(YandexGuard)
export const Mailru = () => UseGuards(MailruGuard)
