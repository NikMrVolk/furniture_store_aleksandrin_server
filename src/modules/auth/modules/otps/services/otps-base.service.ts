import { Injectable, NotFoundException } from '@nestjs/common'
import { OtpsHandlersService } from './otps-handlers.service'
import { IFingerprint } from 'src/utils/decorators'
import { OtpInfo } from '@prisma/client'
import { concatIfStringNotInclude, issueOtpCode } from 'src/utils/helpers'
import { MailsService } from 'src/modules/mails/mails.service'
import { PrismaService } from 'src/utils/services/prisma'

@Injectable()
export class OtpsBaseService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailsService,
        private readonly otpsHandlersService: OtpsHandlersService,
    ) {}

    public async getAndSendOtp({
        email,
        userKey,
        fingerprint,
    }: {
        email: string
        userKey: string
        fingerprint: IFingerprint
    }): Promise<void> {
        const otpCode = await this.generateAndSaveOtpCode({
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
        const otpInfo = await this.getOtpInfoByKey(userKey)

        if (
            !otpInfo ||
            !otpInfo.emails.includes(email) ||
            otpInfo.otpCode === null
        ) {
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

    private async generateAndSaveOtpCode({
        email,
        userKey,
        fingerprint,
    }: {
        userKey: string
        email: string
        fingerprint: IFingerprint
    }): Promise<string> {
        const otpCode = issueOtpCode()
        const otpInfo = await this.getOtpInfoByKey(userKey)
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
                    emails: concatIfStringNotInclude({
                        str: otpInfo.emails,
                        newStr: email,
                    }),
                },
            })
        } else {
            newOrUpdatedOtpInfo = await this.prisma.otpInfo.create({
                data: {
                    unauthUserKey: userKey,
                    emails: email,
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

    private async getOtpInfoByKey(userKey: string): Promise<OtpInfo | null> {
        return await this.prisma.otpInfo.findUnique({
            where: { unauthUserKey: userKey },
        })
    }
}
