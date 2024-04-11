import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { MailService } from 'src/mail/mail.service'
import { PrismaService } from 'src/prisma.service'
import { AuthService } from './auth.service'
import { ITotalActivation } from 'src/shared/types/auth.interface'
import { TotalActivationAttempts } from '@prisma/client'
import { issueActivationCode } from 'src/shared/helpers'
import { UserService } from 'src/user/user.service'

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
    }: {
        email: string
        type: 'login' | 'registration'
        userKey: string
    }): Promise<void> {
        if (type === 'registration') {
            await this.userService.checkingUserExistsByEmail(email)
        }

        if (type === 'login') {
            const user = await this.userService.getByEmail(email)

            if (!user) {
                throw new NotFoundException(
                    `Пользователь с почтой ${email} не зарегистрирован`,
                )
            }
        }

        const activationCode = await this.generateAndSaveActivationCode({
            email,
            userKey,
        })

        this.mailService.sendActivationCode({
            email,
            activationCode,
        })
    }

    private async getOldTotalActivationData(
        userKey: string,
    ): Promise<ITotalActivation | null> {
        return await this.prisma.totalActivationAttempts.findUnique({
            where: { unauthorizedUserKey: userKey },
            include: {
                userActivation: true,
            },
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
        const oldTotalActivationData =
            await this.getOldTotalActivationData(userKey)

        if (
            !oldTotalActivationData?.userActivation ||
            oldTotalActivationData.userActivation.email !== email
        ) {
            throw new NotFoundException(
                'Предоставленная вами информация не действительна.',
            )
        }

        await this.handlingLargeAttempts({
            oldTotalActivationData,
            email,
        })

        await this.codeExpiredCheck({ oldTotalActivationData, email })

        if (
            oldTotalActivationData.userActivation.activationCode !==
            activationCode
        ) {
            await this.prisma.userActivation.update({
                where: { id: oldTotalActivationData.userActivation.id },
                data: {
                    activationAttempts: {
                        increment: 1,
                    },
                },
            })

            throw new BadRequestException(
                `Не верный код активации. Повторите попытку.`,
            )
        }

        await this.prisma.userActivation.delete({
            where: { id: oldTotalActivationData.userActivation.id },
        })
    }

    private async generateAndSaveActivationCode({
        email,
        userKey,
    }: {
        userKey: string
        email: string
    }): Promise<string> {
        const activationCode = issueActivationCode()
        const oldTotalActivationAttempts =
            await this.getOldTotalActivationData(userKey)

        if (oldTotalActivationAttempts) {
            await this.checkMaxMailSend(oldTotalActivationAttempts)

            await this.prisma.totalActivationAttempts.update({
                where: { id: oldTotalActivationAttempts.id },
                data: {
                    unauthorizedUserKey: userKey,
                    totalSendMailAttempts: {
                        increment: 1,
                    },
                    userActivation: oldTotalActivationAttempts.userActivation
                        ? {
                              update: {
                                  email,
                                  activationCode,
                                  activationAttempts: 1,
                              },
                          }
                        : {
                              create: {
                                  email,
                                  activationCode,
                              },
                          },
                },
            })
        } else {
            await this.prisma.totalActivationAttempts.create({
                data: {
                    unauthorizedUserKey: userKey,
                    userActivation: {
                        create: {
                            email,
                            activationCode,
                        },
                    },
                },
            })
        }

        return activationCode
    }

    private async checkMaxMailSend(
        totalActivationAttempts: TotalActivationAttempts,
    ): Promise<void> {
        if (
            totalActivationAttempts.totalSendMailAttempts >=
            this.MAX_MAIL_ATTEMPTS
        ) {
            throw new BadRequestException(
                'Вы превысили лимит отправки сообщений. Повторите попытку позже или обратитесь к администратору.',
            )
        }
    }

    private async handlingLargeAttempts({
        oldTotalActivationData,
        email,
    }: {
        oldTotalActivationData: ITotalActivation
        email: string
    }): Promise<void> {
        if (
            oldTotalActivationData.userActivation.activationAttempts >=
            this.MAX_CODE_ATTEMPTS
        ) {
            const newActivationCode = issueActivationCode()

            await this.checkMaxMailSend(oldTotalActivationData)

            await this.updateTotalActivationAndSendMail({
                oldTotalActivationData,
                newActivationCode,
                email,
            })

            throw new BadRequestException(
                `На почту ${email} выслан новый код активации.`,
            )
        }
    }

    private async codeExpiredCheck({
        oldTotalActivationData,
        email,
    }: {
        oldTotalActivationData: ITotalActivation
        email: string
    }) {
        const activationDate = new Date(
            oldTotalActivationData.userActivation.updatedAt,
        )
        const oneHourAgo = new Date()
        oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 1)

        if (oneHourAgo > activationDate) {
            const newActivationCode = issueActivationCode()

            await this.handlingLargeAttempts({ oldTotalActivationData, email })

            await this.updateTotalActivationAndSendMail({
                oldTotalActivationData,
                newActivationCode,
                email,
            })

            throw new BadRequestException(
                `Срок действия кода активации истёк. Новый код отправлен на почту ${email}.`,
            )
        }
    }

    private async updateTotalActivationAndSendMail({
        email,
        oldTotalActivationData,
        newActivationCode,
    }: {
        email: string
        oldTotalActivationData: ITotalActivation
        newActivationCode: string
    }) {
        await this.prisma.totalActivationAttempts.update({
            where: { id: oldTotalActivationData.id },
            data: {
                totalSendMailAttempts: { increment: 1 },

                userActivation: {
                    update: {
                        where: {
                            id: oldTotalActivationData.userActivation.id,
                        },
                        data: {
                            activationCode: newActivationCode,
                            activationAttempts: 1,
                        },
                    },
                },
            },
        })

        this.mailService.sendActivationCode({
            email,
            activationCode: newActivationCode,
        })
    }
}
