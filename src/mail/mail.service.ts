import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) {}

    async sendActivationCode({
        email,
        activationCode,
    }: {
        email: string
        activationCode: string
    }) {
        await this.mailerService.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            template: 'activate',
            subject: 'Активация аккаунта',
            context: { activationCode },
        })
    }
}
