import { HttpService } from '@nestjs/axios'
import { Controller, Get, HttpCode, Query, Req, Res } from '@nestjs/common'
import { Provider } from '@prisma/client'
import { Request, Response } from 'express'
import { mergeMap } from 'rxjs'
import { Fingerprint } from 'src/auth/decorators/fingerprint.decorator'
import { SessionsService } from 'src/auth/services/sessions.service'
import { TokensService } from 'src/auth/services/tokens.service'
import { handleTimeoutAndErrors } from 'src/shared/helpers'
import { OAuth2Service } from './oauth2.service'
import { Google, Mailru, Yandex } from './decorators/oauth2.decorator'
import { Tokens } from 'src/shared/types/auth.interface'

@Controller('oauth2')
export class OAuth2Controller {
    private readonly OAUTH_SUCCESS_URL: string
    private readonly GOOGLE_ACCESS_URL: string
    private readonly YANDEX_ACCESS_URL: string
    private readonly MAILRU_ACCESS_URL: string

    constructor(
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly httpService: HttpService,
        private readonly oAuth2Service: OAuth2Service,
    ) {
        this.OAUTH_SUCCESS_URL = 'http://localhost:3000/oauth2'
        this.GOOGLE_ACCESS_URL =
            'https://www.googleapis.com/oauth2/v3/tokeninfo'
        this.YANDEX_ACCESS_URL = 'https://login.yandex.ru/info'
        this.MAILRU_ACCESS_URL = 'https://oauth.mail.ru/userinfo'
    }

    @HttpCode(200)
    @Google()
    @Get('google')
    googleAuth() {}

    @HttpCode(200)
    @Google()
    @Get('google/callback')
    googleAuthCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user[Tokens.ACCESS_TOKEN_NAME]
        const name = req.user['name']
        const surname = req.user['surname']
        return res.redirect(
            `${this.OAUTH_SUCCESS_URL}?token=${token}&name=${name}&surname=${surname}`,
        )
    }

    @HttpCode(200)
    @Get('google/success')
    async googleSuccess(
        @Query() user: { token: string; name: string; surname: string },
        @Fingerprint('fingerprint') fingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { token, name, surname } = user
        return this.httpService
            .get(`${this.GOOGLE_ACCESS_URL}?access_token=${token}`)
            .pipe(
                mergeMap(async ({ data: { email } }) => {
                    const { refreshToken, ...response } =
                        await this.oAuth2Service.oAuth({
                            email,
                            fingerprint,
                            provider: Provider.GOOGLE,
                            name,
                            surname,
                        })

                    await this.sessionsService.createSession({
                        userId: response.id,
                        fingerprint,
                        accessToken: response.accessToken,
                        refreshToken,
                    })

                    this.tokensService.addRefreshTokenToResponse(
                        res,
                        refreshToken,
                    )

                    return response
                }),
                handleTimeoutAndErrors(),
            )
    }

    @Yandex()
    @Get('yandex')
    yandexAuth() {}

    @Yandex()
    @Get('yandex/callback')
    yandexAuthCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user[Tokens.ACCESS_TOKEN_NAME]
        const name = req.user['name']
        const surname = req.user['surname']
        const phone = req.user['phone']
        return res.redirect(
            `${this.OAUTH_SUCCESS_URL}?token=${token}&name=${name}&surname=${surname}&phone=${phone}`,
        )
    }

    @Get('yandex/success')
    yandexSuccess(
        @Query()
        user: {
            token: string
            name: string | null
            surname: string | null
            phone: string | null
        },
        @Fingerprint('fingerprint') fingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { token, name, surname, phone } = user
        return this.httpService
            .get(`${this.YANDEX_ACCESS_URL}?oauth_token=${token}`)
            .pipe(
                mergeMap(async ({ data: { default_email } }) => {
                    const { refreshToken, ...response } =
                        await this.oAuth2Service.oAuth({
                            email: default_email,
                            fingerprint,
                            provider: Provider.YANDEX,
                            name,
                            surname,
                            phone,
                        })

                    await this.sessionsService.createSession({
                        userId: response.id,
                        fingerprint,
                        accessToken: response.accessToken,
                        refreshToken,
                    })

                    this.tokensService.addRefreshTokenToResponse(
                        res,
                        refreshToken,
                    )

                    return response
                }),
                handleTimeoutAndErrors(),
            )
    }

    @Mailru()
    @Get('mailru')
    mailruAuth() {}

    @Mailru()
    @Get('mailru/callback')
    mailruAuthCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user[Tokens.ACCESS_TOKEN_NAME]

        return res.redirect(`${this.OAUTH_SUCCESS_URL}?token=${token}`)
    }

    @Get('mailru/success')
    mailruSuccess(
        @Query('token') token: string,
        @Fingerprint('fingerprint') fingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        return this.httpService
            .get(`${this.MAILRU_ACCESS_URL}?access_token=${token}`)
            .pipe(
                mergeMap(async ({ data: { email, first_name, last_name } }) => {
                    const { refreshToken, ...response } =
                        await this.oAuth2Service.oAuth({
                            email,
                            fingerprint,
                            provider: Provider.YANDEX,
                            name: first_name,
                            surname: last_name,
                        })

                    await this.sessionsService.createSession({
                        userId: response.id,
                        fingerprint,
                        accessToken: response.accessToken,
                        refreshToken,
                    })

                    this.tokensService.addRefreshTokenToResponse(
                        res,
                        refreshToken,
                    )

                    return response
                }),
                handleTimeoutAndErrors(),
            )
    }
}
