import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) {}

    async sendMail({
        to,
        activationLink,
    }: {
        to: string
        activationLink: string
    }) {
        await this.mailerService.sendMail({
            from: process.env.SMTP_USER,
            to,
            template: 'activate',
            subject: 'Активация аккаунта',
            context: { activationLink },
        })
    }
}
