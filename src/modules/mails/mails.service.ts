import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailsService {
    constructor(private readonly mailerService: MailerService) {}

    async sendOtpCode({
        email,
        otpCode,
    }: {
        email: string
        otpCode: string
    }) {
        await this.mailerService.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            template: 'otp',
            subject: 'Подтверждение почты',
            context: { otpCode },
        })
    }
}
