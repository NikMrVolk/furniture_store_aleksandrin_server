import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Provider } from '@prisma/client'
import { SessionsService } from 'src/auth/services/sessions.service'
import { TokensService } from 'src/auth/services/tokens.service'
import { UserService } from 'src/auth/services/user.service'
import { IAuthResponse } from 'src/shared/types/auth.interface'

@Injectable()
export class OAuth2Service {
    constructor(
        private userService: UserService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
    ) {}

    async oAuth({
        email,
        fingerprint,
        provider,
        name,
        surname,
        phone,
    }: {
        email: string
        fingerprint: string
        provider: Provider
        name?: string | null
        surname?: string | null
        phone?: string | null
    }): Promise<IAuthResponse> {
        const userExist = await this.userService.getByEmail(email)

        if (userExist) {
            await this.sessionsService.checkQuantitySessions(userExist.id)
            const tokens = await this.tokensService.issueTokens({
                id: userExist.id,
                roles: userExist.roles,
                fingerprint,
            })

            return { ...userExist, ...tokens }
        }

        const user = await this.userService.createByOAuth({
            email,
            provider,
            name,
            surname,
            phone,
        })

        if (!user) {
            throw new HttpException(
                `Не получилось создать пользователя с почтой ${email} в ${provider.toLowerCase()}`,
                HttpStatus.BAD_REQUEST,
            )
        }

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            roles: user.roles,
            fingerprint,
        })

        return { ...user, ...tokens }
    }
}
