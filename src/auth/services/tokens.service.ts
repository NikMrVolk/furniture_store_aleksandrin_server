import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Response } from 'express'
import {
    IAuthResponse,
    IJwtPayload,
    Tokens,
} from 'src/shared/types/auth.interface'
import { UserService } from 'src/user/user.service'

@Injectable()
export class TokensService {
    EXPIRE_DAY_REFRESH_TOKEN = 15

    constructor(
        private userService: UserService,
        private jwt: JwtService,
    ) {}

    async issueTokens({ id, fingerprint, roles }: IJwtPayload) {
        try {
            const data = { id, fingerprint, roles }

            const accessToken = this.jwt.sign(data, {
                expiresIn: '1h',
            })

            const refreshToken = this.jwt.sign(data, {
                expiresIn: '15d',
            })

            return { accessToken, refreshToken }
        } catch (e) {
            console.log('IssueTokens error -', e)
        }
    }

    async getNewTokens(
        refreshToken: string,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        try {
            const result = await this.jwt.verifyAsync(refreshToken)
            if (!result)
                throw new UnauthorizedException('Invalid refresh token')

            const user = await this.userService.getById(
                result.id,
            )
            const tokens = await this.issueTokens({
                id: user.id,
                fingerprint,
                roles: user.roles,
            })

            return { ...user, ...tokens }
        } catch {
            throw new UnauthorizedException('Invalid refresh token')
        }
    }

    addRefreshTokenToResponse(res: Response, refreshToken: string) {
        const expiresIn = new Date()
        expiresIn.setDate(expiresIn.getDate() + this.EXPIRE_DAY_REFRESH_TOKEN)

        res.cookie(Tokens.REFRESH_TOKEN_NAME, refreshToken, {
            httpOnly: true,
            domain: process.env.CLIENT_DOMAIN,
            expires: expiresIn,
            secure: true,
            sameSite: process.env.COOKIE_SAME_SITE as 'none' | 'lax',
        })
    }

    removeRefreshTokenFromResponse(res: Response) {
        res.cookie(Tokens.REFRESH_TOKEN_NAME, '', {
            httpOnly: true,
            domain: process.env.CLIENT_DOMAIN,
            expires: new Date(0),
            secure: true,
            sameSite: process.env.COOKIE_SAME_SITE as 'none' | 'lax',
        })
    }
}
