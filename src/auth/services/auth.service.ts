import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { IAuthResponse } from 'src/shared/types/auth.interface'
import { TokensService } from './tokens.service'
import { UserService } from 'src/user/user.service'
import { PrismaService } from 'src/prisma.service'
import { MailService } from 'src/mail/mail.service'
import { issueActivationCode } from 'src/shared/helpers'
import { User, UserActivation } from '@prisma/client'
import { LoginDto, RegistrationDto } from '../dto'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tokensService: TokensService,
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
    ) {}

    async checkMail({
        email,
        type,
    }: {
        email: string
        type: 'login' | 'registration'
    }): Promise<void> {
        if (type === 'registration') {
            await this.checkIsUserExist(email)
        }

        if (type === 'login') {
            await this.searchUserToLogin(email)
        }

        const activationCode = await this.generateAndSaveActivationCode(email)

        this.mailService.sendActivationCode({
            email,
            activationCode,
        })
    }

    async registration(
        dto: RegistrationDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        await this.checkIsUserExist(dto.email)
        await this.checkActivationCode({
            email: dto.email,
            activationCode: dto.activationCode,
        })

        const user = await this.userService.create(dto)

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    async login(dto: LoginDto, fingerprint: string): Promise<IAuthResponse> {
        const user = await this.searchUserToLogin(dto.email)

        await this.checkActivationCode({
            email: dto.email,
            activationCode: dto.activationCode,
        })

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    private async checkIsUserExist(email: string): Promise<void> {
        const oldUser = await this.userService.getByEmail(email)

        if (oldUser)
            throw new ConflictException(
                `Пользователь с почтой ${email} уже существует`,
            )
    }

    private async searchUserToLogin(email: string): Promise<User> {
        const user = await this.userService.getByEmail(email)

        if (!user)
            throw new NotFoundException(
                `Пользователь с почтой ${email} не зарегистрирован`,
            )

        return user
    }

    private async getOldActivationData(email: string): Promise<UserActivation> {
        return await this.prisma.userActivation.findUnique({
            where: { email },
        })
    }

    private async generateAndSaveActivationCode(
        email: string,
    ): Promise<string> {
        const activationCode = issueActivationCode()

        const oldActivationData = await this.getOldActivationData(email)

        if (oldActivationData) {
            await this.prisma.userActivation.update({
                where: { id: oldActivationData.id },
                data: {
                    activationCode,
                },
            })
        } else {
            await this.prisma.userActivation.create({
                data: {
                    email,
                    activationCode,
                },
            })
        }

        return activationCode
    }

    private async handlingLargeAttempts({
        oldActivationData,
        email,
    }: {
        oldActivationData: UserActivation
        email: string
    }): Promise<void> {
        const newActivationCode = issueActivationCode()

        await this.prisma.userActivation.update({
            where: { id: oldActivationData.id },
            data: {
                activationCode: newActivationCode,
                activationAttempts: 0,
            },
        })

        this.mailService.sendActivationCode({
            email,
            activationCode: newActivationCode,
        })

        throw new BadRequestException(
            `На почту ${email} выслан новый код активации`,
        )
    }

    private async checkActivationCode({
        email,
        activationCode,
    }: {
        email: string
        activationCode: string
    }): Promise<void> {
        const oldActivationData = await this.getOldActivationData(email)

        if (oldActivationData.activationCode !== activationCode) {
            if (oldActivationData.activationAttempts >= 3) {
                await this.handlingLargeAttempts({ oldActivationData, email })
            }

            await this.prisma.userActivation.update({
                where: { id: oldActivationData.id },
                data: {
                    activationAttempts:
                        oldActivationData.activationAttempts + 1,
                },
            })

            throw new BadRequestException(
                `Не верный код активации. Повторите попытку`,
            )
        }

        await this.prisma.userActivation.delete({
            where: { id: oldActivationData.id },
        })
    }
}
