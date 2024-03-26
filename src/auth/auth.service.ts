import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import { LoginUserDto } from './dto/login-user.dto'
import { UserService } from './user.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { CreateUserDto } from './dto/create-user.dto'
import { IAuthResponse, Tokens } from './auth.types'
import { Response } from 'express'
import { PrismaService } from 'src/prisma.service'
import { Session } from '@prisma/client'

@Injectable()
export class AuthService {
    EXPIRE_DAY_REFRESH_TOKEN = 1

    constructor(
        private userService: UserService,
        private jwt: JwtService,
        private prisma: PrismaService,
    ) {}

    async registration(
        dto: CreateUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        const oldUser = await this.userService.getByEmail(dto.email)

        if (oldUser)
            throw new BadRequestException(
                `Пользователь с почтой ${dto.email} уже существует`,
            )

        const { password, ...user } = await this.userService.create(dto)

        const tokens = await this.issueTokens(user.id, fingerprint)

        return { ...user, ...tokens }
    }

    async login(
        dto: LoginUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        const { password, ...user } = await this.validateUser(dto)
        const tokens = await this.issueTokens(user.id, fingerprint)

        return { ...user, ...tokens }
    }

    async getNewTokens(
        refreshToken: string,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        try {
            const result = await this.jwt.verifyAsync(refreshToken)
            if (!result)
                throw new UnauthorizedException('Invalid refresh token')

            const { password, ...user } = await this.userService.getById(
                result.id,
            )
            const tokens = await this.issueTokens(user.id, fingerprint)

            return { ...user, ...tokens }
        } catch {
            throw new UnauthorizedException('Invalid refresh token')
        }
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

    private async issueTokens(userId: number, fingerprint: string) {
        const data = { id: userId, fingerprint }

        const accessToken = this.jwt.sign(data, {
            expiresIn: '1h',
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: '15d',
        })

        return { accessToken, refreshToken }
    }

    addRefreshTokenToResponse(res: Response, refreshToken: string) {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

        res.cookie(Tokens.REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            domain: process.env.DOMAIN,
            expires: expiresIn,
            secure: true,
            sameSite: process.env.SAME_SITE as 'none' | 'lax',
        })
    }

    removeRefreshTokenFromResponse(res: Response) {
        res.cookie(Tokens.REFRESH_TOKEN_NAME, '', {
            httpOnly: true,
            domain: process.env.DOMAIN,
            expires: new Date(0),
            secure: true,
            sameSite: process.env.SAME_SITE as 'none' | 'lax',
        })
    }

    async createSession({
        userId,
        fingerprint,
        accessToken,
        refreshToken,
    }: {
        userId: number
        fingerprint: string
        accessToken: string
        refreshToken: string
    }): Promise<void> {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + 15)

        await this.prisma.session.create({
            data: {
                userId,
                fingerprint,
                accessToken,
                refreshToken,
                expiresIn,
            },
        })
    }

    async addNewAccessTokenToDB({
        userId,
        accessToken,
        refreshTokenFromCookies,
    }: {
        userId: number
        accessToken: string
        refreshTokenFromCookies: string
    }): Promise<void> {
        const { sessions } = await this.userService.getUserSessions(userId)

        const currentSession = sessions.find(
            (el) => el.refreshToken === refreshTokenFromCookies,
        )

        if (currentSession) {
            await this.prisma.session.update({
                where: { id: currentSession.id },
                data: { accessToken },
            })
        }
    }

    async deleteSessionById(id: number): Promise<void> {
        await this.prisma.session.delete({ where: { id } })
    }

    async checkExpiredSession(session: Session): Promise<boolean> {
        const currentDate = new Date()

        if (currentDate.getTime() > session.expiresIn.getTime()) {
            await this.prisma.session.delete({ where: { id: session.id } })
            return true
        }

        return false
    }

    async checkQuantitySessions(id: number) {
        const { sessions } = await this.userService.getUserSessions(id)

        if (sessions.length > 2) {
            const firstSessionId = sessions[0].id

            await this.prisma.session.delete({
                where: { id: firstSessionId },
            })
        }
    }

    async deleteSessionByRefreshToken(
        userId: number,
        refreshToken: string,
    ): Promise<void> {
        const { sessions } = await this.userService.getUserSessions(userId)

        const currentSession = sessions.find(
            (el) => el.refreshToken === refreshToken,
        )

        if (currentSession) {
            await this.prisma.session.delete({
                where: { id: currentSession.id },
            })
        }
    }
}
