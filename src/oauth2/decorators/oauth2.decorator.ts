import { UseGuards } from '@nestjs/common'
import { GoogleGuard } from '../guards/google.guard'
import { YandexGuard } from '../guards/yandex.guard'
import { MailruGuard } from '../guards/mailru.guard'

export const Google = () => UseGuards(GoogleGuard)
export const Yandex = () => UseGuards(YandexGuard)
export const Mailru = () => UseGuards(MailruGuard)
