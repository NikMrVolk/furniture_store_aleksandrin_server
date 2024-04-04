import { HttpService } from '@nestjs/axios'
import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { Provider } from '@prisma/client'
import { firstValueFrom } from 'rxjs'
import { SessionsService } from 'src/auth/services/sessions.service'
import { TokensService } from 'src/auth/services/tokens.service'
import { UserService } from 'src/auth/services/user.service'
import { handleTimeoutAndErrors } from 'src/shared/helpers'
import { IAuthResponse, IOAuth } from 'src/shared/types/auth.interface'

@Injectable()
export class OAuth2Service {
    constructor(
        private userService: UserService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly httpService: HttpService,
    ) {}

    public async oAuth({ url, user, fingerprint, provider }: IOAuth) {
        const {
            data: { email, default_email, first_name, last_name },
        } = await this.getUserData({
            url,
            token: user.token,
        })

        return await this.findOrCreate({
            email: email ?? default_email,
            fingerprint,
            provider,
            name: first_name ?? user?.name,
            surname: last_name ?? user?.name,
            phone: user?.phone,
        })
    }

    private async getUserData({ url, token }: { url: string; token: string }) {
        const userData = await firstValueFrom(
            this.httpService
                .get(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                })
                .pipe(handleTimeoutAndErrors()),
        )

        return userData
    }

    private async findOrCreate({
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
