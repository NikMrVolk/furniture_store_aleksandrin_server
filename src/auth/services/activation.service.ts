import { Injectable, NotFoundException } from '@nestjs/common'
import { MailService } from 'src/mail/mail.service'
import { PrismaService } from 'src/prisma.service'
import { User, UserActivation } from '@prisma/client'
import { issueActivationCode, pushIfNewElUnique } from 'src/shared/helpers'
import { UserService } from 'src/user/user.service'
import { IFingerprint } from '../decorators/fingerprint.decorator'
import { ActivationHandlerService } from './activation-handler.service'

@Injectable()
export class ActivationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly userService: UserService,
        private readonly activationHandlerService: ActivationHandlerService,
    ) {}

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
        fingerprint,
    }: {
        email: string
        activationCode: string
        userKey: string
        fingerprint: string
    }): Promise<void> {
        const userActivation = await this.getUserActivationByKey(userKey)

        if (!userActivation || !userActivation.emails.includes(email)) {
            throw new NotFoundException(
                'Предоставленная вами информация не действительна.',
            )
        }

        await this.activationHandlerService.largeMailAttempts(userActivation)
        await this.activationHandlerService.blockSuspicionUser({
            userActivation,
            email,
            fingerprint,
        })
        await this.activationHandlerService.expiringCode({
            userActivation,
            email,
        })
        await this.activationHandlerService.invalidCode({
            email,
            userActivation,
            activationCode,
        })

        await this.prisma.userActivation.update({
            where: { id: userActivation.id },
            data: {
                activationCode: null,
                codeAttempts:
                    this.activationHandlerService.ATTEMPTS_START_VALUE,
            },
        })
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
            await this.activationHandlerService.largeMailAttempts(
                userActivation,
            )
            await this.activationHandlerService.lastMailAttempts(userActivation)
            await this.activationHandlerService.blockNewMessageBeforeOneMinute({
                userActivation,
            })

            newOrUpdatedUserActivation =
                await this.prisma.userActivation.update({
                    where: { id: userActivation.id },
                    data: {
                        unauthUserKey: userKey,
                        mailAttempts: {
                            increment:
                                this.activationHandlerService
                                    .ATTEMPTS_INCREMENT_VALUE,
                        },
                        codeAttempts:
                            this.activationHandlerService.ATTEMPTS_START_VALUE,
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

        await this.activationHandlerService.blockSuspicionUser({
            userActivation: newOrUpdatedUserActivation,
            email,
            fingerprint: fingerprint.reqHeadersString,
        })

        return activationCode
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
}
