import { Injectable, NotFoundException } from '@nestjs/common'
import { OtpsHandlersService } from './otps-handlers.service'
import { IFingerprint } from 'src/utils/decorators'
import { OtpInfo, User } from '@prisma/client'
import { issueOtpCode, pushIfNewElUnique } from 'src/utils/helpers'
import { MailsService } from 'src/modules/mails/mails.service'
import { UsersService } from 'src/modules/users/users.service'
import { PrismaService } from 'src/utils/services/prisma'

@Injectable()
export class OtpsBaseService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailsService,
        private readonly userService: UsersService,
        private readonly otpsHandlersService: OtpsHandlersService,
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

        const otpCode = await this.generateAndSaveotpCode({
            email,
            userKey,
            fingerprint: fingerprint,
        })

        this.mailService.sendOtpCode({
            email,
            otpCode,
        })
    }

    public async checkOtpCode({
        email,
        otpCode,
        userKey,
        fingerprint,
    }: {
        email: string
        otpCode: string
        userKey: string
        fingerprint: string
    }): Promise<void> {
        const otpInfo = await this.getotpInfoByKey(userKey)

        if (!otpInfo || !otpInfo.emails.includes(email)) {
            throw new NotFoundException(
                'Предоставленная вами информация не действительна.',
            )
        }

        await this.otpsHandlersService.largeMailAttempts(otpInfo)
        await this.otpsHandlersService.blockSuspicionUser({
            otpInfo,
            email,
            fingerprint,
        })
        await this.otpsHandlersService.expiringCode({
            otpInfo,
            email,
        })
        await this.otpsHandlersService.invalidCode({
            email,
            otpInfo,
            otpCode,
        })

        await this.prisma.otpInfo.update({
            where: { id: otpInfo.id },
            data: {
                otpCode: null,
                codeAttempts: this.otpsHandlersService.ATTEMPTS_START_VALUE,
            },
        })
    }

    private async generateAndSaveotpCode({
        email,
        userKey,
        fingerprint,
    }: {
        userKey: string
        email: string
        fingerprint: IFingerprint
    }): Promise<string> {
        const otpCode = issueOtpCode()
        const otpInfo = await this.getotpInfoByKey(userKey)
        let newOrUpdatedOtpInfo: OtpInfo

        if (otpInfo) {
            await this.otpsHandlersService.largeMailAttempts(otpInfo)
            await this.otpsHandlersService.lastMailAttempts(otpInfo)
            await this.otpsHandlersService.blockNewMessageBeforeOneMinute({
                otpInfo,
            })

            newOrUpdatedOtpInfo = await this.prisma.otpInfo.update({
                where: { id: otpInfo.id },
                data: {
                    unauthUserKey: userKey,
                    mailAttempts: {
                        increment:
                            this.otpsHandlersService.ATTEMPTS_INCREMENT_VALUE,
                    },
                    codeAttempts: this.otpsHandlersService.ATTEMPTS_START_VALUE,
                    otpCode,
                    emails: pushIfNewElUnique(otpInfo.emails, email),
                },
            })
        } else {
            newOrUpdatedOtpInfo = await this.prisma.otpInfo.create({
                data: {
                    unauthUserKey: userKey,
                    emails: {
                        set: [email],
                    },
                    otpCode,
                    fingerprint: fingerprint.hashFingerprint,
                },
            })
        }

        await this.otpsHandlersService.blockSuspicionUser({
            otpInfo: newOrUpdatedOtpInfo,
            email,
            fingerprint: fingerprint.reqHeadersString,
        })

        return otpCode
    }

    private async getotpInfoByKey(userKey: string): Promise<OtpInfo | null> {
        return await this.prisma.otpInfo.findUnique({
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
