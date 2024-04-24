import { BadRequestException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { OtpInfo } from '@prisma/client'
import { issueOtpCode } from 'src/utils/helpers'
import { MailsService } from 'src/modules/mails/mails.service'
import { PrismaService } from 'src/utils/services/prisma'

@Injectable()
export class OtpsHandlersService {
    public readonly ATTEMPTS_START_VALUE: number = 1
    public readonly ATTEMPTS_INCREMENT_VALUE: number = 1
    private readonly MAX_CODE_ATTEMPTS: number = 3
    // actually number of messages with the code is 1 less then next variable
    private readonly MAX_MAIL_ATTEMPTS: number = 5
    private readonly SUSPICIOUSNESS_CHECK_LIMIT: number = 3
    private readonly NUMBER_MINUTES_BETWEEN_SENDS_NEW_CODE: number = 1
    private readonly NUMBER_HOURS_EXPIRE_CODE: number = 1

    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailsService,
    ) {}

    public async blockSuspicionUser({
        otpInfo,
        email,
        fingerprint,
    }: {
        otpInfo: OtpInfo
        email: string
        fingerprint: string
    }): Promise<void> {
        if (otpInfo.mailAttempts < this.SUSPICIOUSNESS_CHECK_LIMIT) {
            const allSuspicionUsers = await this.prisma.otpInfo.findMany({
                where: {
                    mailAttempts: {
                        gte: this.MAX_MAIL_ATTEMPTS,
                    },
                    ...(otpInfo.mailAttempts === this.ATTEMPTS_START_VALUE && {
                        emails: { contains: email },
                    }),
                },
                select: {
                    fingerprint: true,
                },
            })

            if (allSuspicionUsers.length) {
                const arrWithCheckingResults = allSuspicionUsers.map((el) =>
                    bcrypt.compareSync(fingerprint, el.fingerprint),
                )

                if (arrWithCheckingResults.includes(true)) {
                    await this.prisma.otpInfo.update({
                        where: { id: otpInfo.id },
                        data: {
                            mailAttempts:
                                this.MAX_MAIL_ATTEMPTS +
                                this.ATTEMPTS_INCREMENT_VALUE,
                        },
                    })

                    throw new BadRequestException(
                        'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
                    )
                }
            }
        }
    }

    public async largeMailAttempts(otpInfo: OtpInfo): Promise<void> {
        if (otpInfo.mailAttempts >= this.MAX_MAIL_ATTEMPTS) {
            throw new BadRequestException(
                'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
            )
        }
    }

    public async expiringCode({
        otpInfo,
        email,
    }: {
        otpInfo: OtpInfo
        email: string
    }) {
        const activationDate = new Date(otpInfo.updatedAt)
        const oneHourAgo = new Date()
        oneHourAgo.setHours(
            oneHourAgo.getHours() - this.NUMBER_HOURS_EXPIRE_CODE,
        )

        if (oneHourAgo > activationDate) {
            const newOtpCode = issueOtpCode()

            await this.lastMailAttempts(otpInfo)

            await this.updateOtpInfoAndSendMail({
                otpInfo,
                newOtpCode,
                email,
            })

            throw new BadRequestException(
                `Срок действия кода активации истёк. Новый код отправлен на почту ${email}.`,
            )
        }
    }

    public async invalidCode({
        email,
        otpInfo,
        otpCode,
    }: {
        email: string
        otpInfo: OtpInfo
        otpCode: string
    }) {
        if (otpInfo.otpCode !== otpCode) {
            await this.lastCodeAttempts({
                email,
                otpInfo,
                newOtpCode: issueOtpCode(),
            })

            await this.prisma.otpInfo.update({
                where: { id: otpInfo.id },
                data: {
                    codeAttempts: {
                        increment: this.ATTEMPTS_INCREMENT_VALUE,
                    },
                },
            })

            throw new BadRequestException(
                `Не верный код активации. Повторите попытку.`,
            )
        }
    }

    private async lastCodeAttempts({
        email,
        otpInfo,
        newOtpCode,
    }: {
        email: string
        otpInfo: OtpInfo
        newOtpCode: string
    }): Promise<void> {
        if (otpInfo.codeAttempts >= this.MAX_CODE_ATTEMPTS) {
            await this.lastMailAttempts(otpInfo)

            await this.updateOtpInfoAndSendMail({
                email,
                otpInfo,
                newOtpCode,
            })

            throw new BadRequestException(
                `Не верный код активации. Новый код отправлен на почту ${email}.`,
            )
        }
    }

    public async blockNewMessageBeforeOneMinute({
        otpInfo,
    }: {
        otpInfo: OtpInfo
    }): Promise<void> {
        const activationDate = new Date(otpInfo.updatedAt)
        const oneMinAgo = new Date()
        oneMinAgo.setMinutes(
            oneMinAgo.getMinutes() - this.NUMBER_MINUTES_BETWEEN_SENDS_NEW_CODE,
        )

        if (oneMinAgo < activationDate) {
            throw new BadRequestException(
                `Следующее сообщение с кодом может быть оправлено только через минуту.`,
            )
        }
    }

    public async lastMailAttempts(otpInfo: OtpInfo) {
        if (
            otpInfo.mailAttempts ===
            this.MAX_MAIL_ATTEMPTS - this.ATTEMPTS_INCREMENT_VALUE
        ) {
            await this.prisma.otpInfo.update({
                where: { id: otpInfo.id },
                data: {
                    mailAttempts: {
                        increment: this.ATTEMPTS_INCREMENT_VALUE,
                    },
                    codeAttempts: this.ATTEMPTS_START_VALUE,
                },
            })

            throw new BadRequestException(
                'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
            )
        }
    }

    private async updateOtpInfoAndSendMail({
        email,
        otpInfo,
        newOtpCode,
    }: {
        email: string
        otpInfo: OtpInfo
        newOtpCode: string
    }): Promise<void> {
        await this.prisma.otpInfo.update({
            where: { id: otpInfo.id },
            data: {
                mailAttempts: { increment: this.ATTEMPTS_INCREMENT_VALUE },
                otpCode: newOtpCode,
                codeAttempts: this.ATTEMPTS_START_VALUE,
            },
        })

        this.mailService.sendOtpCode({
            email,
            otpCode: newOtpCode,
        })
    }
}
