import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import { LoginUserDto } from '../dto/login-user.dto'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from '../dto/create-user.dto'
import {
    IAuthResponse,
    IAuthResponseWithoutRefresh,
} from 'src/shared/types/auth.interface'
import { TokensService } from './tokens.service'
import { Response } from 'express'
import { UserService } from 'src/user/user.service'
import { SessionsService } from 'src/sessions/sessions.service'
import { PrismaService } from 'src/prisma.service'
import { MailService } from 'src/mail/mail.service'
import { issueActivationCode } from 'src/shared/helpers'
import { UserActivation } from '@prisma/client'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tokensService: TokensService,
        private readonly sessionsService: SessionsService,
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
    ) {}

    async checkMail(email: string): Promise<void> {
        await this.checkOldUser(email)

        const activationCode = await this.generateAndSaveActivationCode(email)

        this.mailService.sendActivationCode({
            email,
            activationCode,
        })
    }

    async registration(
        dto: CreateUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        await this.checkOldUser(dto.email)
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

    async login(
        dto: LoginUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        const { password, ...user } = await this.validateUser(dto)
        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    private async validateUser(dto: LoginUserDto) {
        const user = await this.userService.getByEmail(dto.email)

        if (!user)
            throw new NotFoundException(
                `Пользователь с почтой ${dto.email} не зарегистрирован`,
            )

        const comparePassword = bcrypt.compareSync(dto.password, user.password)

        if (!comparePassword)
            throw new UnauthorizedException('Не верный пароль')

        return user
    }

    async createSessionAndAddRefreshToResponse({
        response,
        fingerprint,
        refreshToken,
        res,
        isCheckQuantitySessions = false,
    }: {
        response: IAuthResponseWithoutRefresh
        fingerprint: string
        refreshToken: string
        res: Response
        isCheckQuantitySessions?: boolean
    }): Promise<void> {
        if (isCheckQuantitySessions) {
            await this.sessionsService.checkQuantitySessions(response.id)
        }

        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)
    }

    private async checkOldUser(email: string): Promise<void> {
        const oldUser = await this.userService.getByEmail(email)

        if (oldUser)
            throw new ConflictException(
                `Пользователь с почтой ${email} уже существует`,
            )
    }

    private async getOldActivationDate(email: string): Promise<UserActivation> {
        return await this.prisma.userActivation.findUnique({
            where: { email },
        })
    }

    private async generateAndSaveActivationCode(
        email: string,
    ): Promise<string> {
        const activationCode = issueActivationCode()

        const oldActivationData = await this.getOldActivationDate(email)

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
        const oldActivationData = await this.getOldActivationDate(email)

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
