import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { MailService } from 'src/mail/mail.service'
import { PrismaService } from 'src/prisma.service'
import { User, UserActivation } from '@prisma/client'
import { issueActivationCode, pushIfNewElUnique } from 'src/shared/helpers'
import { UserService } from 'src/user/user.service'
import * as bcrypt from 'bcrypt'
import { IFingerprint } from '../decorators/fingerprint.decorator'

@Injectable()
export class ActivationService {
    private readonly MAX_CODE_ATTEMPTS: number
    private readonly MAX_MAIL_ATTEMPTS: number
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly userService: UserService,
    ) {
        this.MAX_CODE_ATTEMPTS = 3
        this.MAX_MAIL_ATTEMPTS = 5
    }

    public async checkMail({
        email,
        type,
        userKey,
        fingerprint,
    }: {
        email: string
        type: 'login' | 'registration'
        userKey: string
        fingerprint: IFingerprint
    }): Promise<void> {
        if (type === 'registration') {
            await this.userService.checkingUserExistsByEmail(email)
        }

        if (type === 'login') {
            await this.getUserByEmailAndCheck(email)
        }

        const activationCode = await this.generateAndSaveActivationCode({
            email,
            userKey,
            fingerprint: fingerprint,
        })

        this.mailService.sendActivationCode({
            email,
            activationCode,
        })
    }

    public async checkActivationCode({
        email,
        activationCode,
        userKey,
    }: {
        email: string
        activationCode: string
        userKey: string
    }): Promise<void> {
        const userActivation = await this.getUserActivationByKey(userKey)

        if (!userActivation || !userActivation.emails.includes(email)) {
            throw new NotFoundException(
                'Предоставленная вами информация не действительна.',
            )
        }

        await this.handleExpiringCode({ userActivation, email })
        await this.handleLargeCodeAttempts({
            userActivation,
            email,
        })
        await this.handleLargeMailAttempts(userActivation)
        await this.handleInvalidCode({
            email,
            userActivation,
            activationCode,
        })

        await this.prisma.userActivation.update({
            where: { id: userActivation.id },
            data: {
                activationCode: null,
                codeAttempts: 0,
            },
        })
    }

    private async getUserActivationByKey(
        userKey: string,
    ): Promise<UserActivation | null> {
        return await this.prisma.userActivation.findUnique({
            where: { unauthUserKey: userKey },
        })
    }

    private async getUserByEmailAndCheck(email: string): Promise<User> {
        const user = await this.userService.getByEmail(email)

        if (!user) {
            throw new NotFoundException(
                `Пользователь с почтой ${email} не зарегистрирован`,
            )
        }

        return user
    }

    private async generateAndSaveActivationCode({
        email,
        userKey,
        fingerprint,
    }: {
        userKey: string
        email: string
        fingerprint: IFingerprint
    }): Promise<string> {
        const activationCode = issueActivationCode()
        const userActivation = await this.getUserActivationByKey(userKey)
        let newOrUpdatedUserActivation: UserActivation

        if (userActivation) {
            await this.handleLargeMailAttempts(userActivation)

            newOrUpdatedUserActivation =
                await this.prisma.userActivation.update({
                    where: { id: userActivation.id },
                    data: {
                        unauthUserKey: userKey,
                        mailAttempts: {
                            increment: 1,
                        },
                        codeAttempts: 1,
                        activationCode,
                        emails: pushIfNewElUnique(userActivation.emails, email),
                    },
                })
        } else {
            newOrUpdatedUserActivation =
                await this.prisma.userActivation.create({
                    data: {
                        unauthUserKey: userKey,
                        emails: {
                            set: [email],
                        },
                        activationCode,
                        fingerprint: fingerprint.hashFingerprint,
                    },
                })
        }

        await this.handleBlockSuspicionUser({
            userActivation: newOrUpdatedUserActivation,
            email,
            fingerprint: fingerprint.reqHeadersString,
        })

        return activationCode
    }

    private async handleLargeMailAttempts(
        userActivation: UserActivation,
    ): Promise<void> {
        if (userActivation.mailAttempts >= this.MAX_MAIL_ATTEMPTS) {
            throw new BadRequestException(
                'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
            )
        }
    }

    private async handleLargeCodeAttempts({
        userActivation,
        email,
    }: {
        userActivation: UserActivation
        email: string
    }): Promise<void> {
        if (userActivation.codeAttempts >= this.MAX_CODE_ATTEMPTS) {
            const newActivationCode = issueActivationCode()

            await this.handleLargeMailAttempts(userActivation)

            await this.updateUserActivationAndSendMail({
                userActivation,
                newActivationCode,
                email,
            })

            throw new BadRequestException(
                `Не верный код активации. На почту ${email} выслан новый.`,
            )
        }
    }

    private async handleExpiringCode({
        userActivation,
        email,
    }: {
        userActivation: UserActivation
        email: string
    }) {
        const activationDate = new Date(userActivation.updatedAt)
        //todo change to one hour
        const oneHourAgo = new Date()
        oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 1)

        if (oneHourAgo > activationDate) {
            await this.handleLargeCodeAttempts({ userActivation, email })
            await this.handleLargeMailAttempts(userActivation)

            const newActivationCode = issueActivationCode()

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

    private async handleInvalidCode({
        email,
        userActivation,
        activationCode,
    }: {
        email: string
        userActivation: UserActivation
        activationCode: string
    }) {
        if (userActivation.activationCode !== activationCode) {
            await this.handleLastCodeAttempts({
                email,
                userActivation,
                newActivationCode: issueActivationCode(),
            })

            await this.prisma.userActivation.update({
                where: { id: userActivation.id },
                data: {
                    codeAttempts: {
                        increment: 1,
                    },
                },
            })

            throw new BadRequestException(
                `Не верный код активации. Повторите попытку.`,
            )
        }
    }

    private async handleLastCodeAttempts({
        email,
        userActivation,
        newActivationCode,
    }: {
        email: string
        userActivation: UserActivation
        newActivationCode: string
    }): Promise<void> {
        if (userActivation.codeAttempts >= this.MAX_CODE_ATTEMPTS) {
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

    private async handleBlockSuspicionUser({
        userActivation,
        email,
        fingerprint,
    }: {
        userActivation: UserActivation
        email: string
        fingerprint: string
    }): Promise<void> {
        if (userActivation.mailAttempts < 3) {
            const checkAttempts = {
                mailAttempts: {
                    gte: this.MAX_MAIL_ATTEMPTS,
                },
            }
            const checkAttemptsAndMail = {
                ...checkAttempts,
                emails: {
                    has: email,
                },
            }

            const allSuspicionUsers = await this.prisma.userActivation.findMany(
                {
                    where:
                        userActivation.mailAttempts === 1
                            ? checkAttemptsAndMail
                            : checkAttempts,
                    select: {
                        fingerprint: true,
                    },
                },
            )

            if (allSuspicionUsers.length) {
                const isSuspicionUser = await Promise.any(
                    allSuspicionUsers.map(
                        async (el) =>
                            await bcrypt.compare(fingerprint, el.fingerprint),
                    ),
                )

                if (isSuspicionUser) {
                    await this.prisma.userActivation.update({
                        where: { id: userActivation.id },
                        data: {
                            mailAttempts: this.MAX_MAIL_ATTEMPTS + 1,
                        },
                    })

                    throw new BadRequestException(
                        'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
                    )
                }
            }
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
                mailAttempts: { increment: 1 },
                activationCode: newActivationCode,
                codeAttempts: 1,
            },
        })

        this.mailService.sendActivationCode({
            email,
            activationCode: newActivationCode,
        })
    }
}