import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UserService } from './user.service'
import { JwtService } from '@nestjs/jwt'
import { IAuthResponse, IJwtPayload, Tokens } from '../auth.types'
import { Response } from 'express'

@Injectable()
export class TokensService {
    EXPIRE_DAY_REFRESH_TOKEN = 15

    constructor(
        private userService: UserService,
        private jwt: JwtService,
    ) {}

    private async issueTokens({ id, fingerprint, roles }: IJwtPayload) {
        const data = { id, fingerprint, roles }

        const accessToken = this.jwt.sign(data, {
            expiresIn: '1h',
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: '15d',
        })

        return { accessToken, refreshToken }
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
}
