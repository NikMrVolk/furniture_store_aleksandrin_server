import { BadRequestException, Injectable } from '@nestjs/common'
import { UserActivation } from '@prisma/client'
import { MailService } from 'src/mail/mail.service'
import { PrismaService } from 'src/prisma.service'
import { issueActivationCode } from 'src/shared/helpers'
import * as bcrypt from 'bcrypt'

@Injectable()
export class ActivationHandlerService {
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
        private readonly mailService: MailService,
    ) {}

    public async blockSuspicionUser({
        userActivation,
        email,
        fingerprint,
    }: {
        userActivation: UserActivation
        email: string
        fingerprint: string
    }): Promise<void> {
        if (userActivation.mailAttempts < this.SUSPICIOUSNESS_CHECK_LIMIT) {
            const whereOptions = {
                mailAttempts: {
                    gte: this.MAX_MAIL_ATTEMPTS,
                },
                ...(userActivation.mailAttempts === this.ATTEMPTS_START_VALUE
                    ? { emails: { has: email } }
                    : {}),
            }

            const allSuspicionUsers = await this.prisma.userActivation.findMany(
                {
                    where: whereOptions,
                    select: {
                        fingerprint: true,
                    },
                },
            )

            if (allSuspicionUsers.length) {
                const arrWithCheckingResults = allSuspicionUsers.map((el) =>
                    bcrypt.compareSync(fingerprint, el.fingerprint),
                )

                if (arrWithCheckingResults.includes(true)) {
                    await this.prisma.userActivation.update({
                        where: { id: userActivation.id },
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

    public async largeMailAttempts(
        userActivation: UserActivation,
    ): Promise<void> {
        if (userActivation.mailAttempts >= this.MAX_MAIL_ATTEMPTS) {
            throw new BadRequestException(
                'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
            )
        }
    }

    public async expiringCode({
        userActivation,
        email,
    }: {
        userActivation: UserActivation
        email: string
    }) {
        const activationDate = new Date(userActivation.updatedAt)
        const oneHourAgo = new Date()
        oneHourAgo.setHours(
            oneHourAgo.getMinutes() - this.NUMBER_HOURS_EXPIRE_CODE,
        )

        if (oneHourAgo > activationDate) {
            const newActivationCode = issueActivationCode()

            await this.lastMailAttempts(userActivation)

            await this.updateUserActivationAndSendMail({
                userActivation,
                newActivationCode,
                email,
            })

            throw new BadRequestException(
                `Срок действия кода активации истёк. Новый код отправлен на почту ${email}.`,
            )
        }
    }

    public async invalidCode({
        email,
        userActivation,
        activationCode,
    }: {
        email: string
        userActivation: UserActivation
        activationCode: string
    }) {
        if (userActivation.activationCode !== activationCode) {
            await this.lastCodeAttempts({
                email,
                userActivation,
                newActivationCode: issueActivationCode(),
            })

            await this.prisma.userActivation.update({
                where: { id: userActivation.id },
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
        userActivation,
        newActivationCode,
    }: {
        email: string
        userActivation: UserActivation
        newActivationCode: string
    }): Promise<void> {
        if (userActivation.codeAttempts >= this.MAX_CODE_ATTEMPTS) {
            await this.lastMailAttempts(userActivation)

            await this.updateUserActivationAndSendMail({
                email,
                userActivation,
                newActivationCode,
            })

            throw new BadRequestException(
                `Не верный код активации. Новый код отправлен на почту ${email}.`,
            )
        }
    }

    public async blockNewMessageBeforeOneMinute({
        userActivation,
    }: {
        userActivation: UserActivation
    }): Promise<void> {
        const activationDate = new Date(userActivation.updatedAt)
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

    public async lastMailAttempts(userActivation: UserActivation) {
        if (
            userActivation.mailAttempts ===
            this.MAX_MAIL_ATTEMPTS - this.ATTEMPTS_INCREMENT_VALUE
        ) {
            await this.prisma.userActivation.update({
                where: { id: userActivation.id },
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

    private async updateUserActivationAndSendMail({
        email,
        userActivation,
        newActivationCode,
    }: {
        email: string
        userActivation: UserActivation
        newActivationCode: string
    }): Promise<void> {
        await this.prisma.userActivation.update({
            where: { id: userActivation.id },
            data: {
                mailAttempts: { increment: this.ATTEMPTS_INCREMENT_VALUE },
                activationCode: newActivationCode,
                codeAttempts: this.ATTEMPTS_START_VALUE,
            },
        })

        this.mailService.sendActivationCode({
            email,
            activationCode: newActivationCode,
        })
    }
}
