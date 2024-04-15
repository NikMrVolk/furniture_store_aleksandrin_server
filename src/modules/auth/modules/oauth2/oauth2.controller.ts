import { Controller, Get, HttpCode, Query, Req, Res } from '@nestjs/common'
import { Provider } from '@prisma/client'
import { Request, Response } from 'express'
import { Fingerprint } from 'src/utils/decorators/fingerprint.decorator'
import { OAuth2Service } from './oauth2.service'
import { Google, Mailru, Yandex } from './decorators/oauth2.decorator'
import { IOAuth, IQueryUser, Tokens } from 'src/utils/types'
import { SessionsRefreshService } from 'src/utils/services/sessions-refresh/sessions-refresh.service'

@Controller('oauth2')
export class OAuth2Controller {
    private readonly OAUTH_SUCCESS_URL: string = `${process.env.CLIENT_URL}/oauth2`
    private readonly GOOGLE_ACCESS_URL: string =
        'https://www.googleapis.com/oauth2/v3/tokeninfo'
    private readonly YANDEX_ACCESS_URL: string = 'https://login.yandex.ru/info'
    private readonly MAILRU_ACCESS_URL: string =
        'https://oauth.mail.ru/userinfo'

    constructor(
        private readonly oAuth2Service: OAuth2Service,
        private readonly sessionsRefreshService: SessionsRefreshService,
    ) {}

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
        @Query() user: IQueryUser,
        @Fingerprint('hashFingerprint') hashFingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        return await this.oAuthAndResponse({
            url: this.GOOGLE_ACCESS_URL,
            user,
            fingerprint: hashFingerprint,
            res,
            provider: Provider.GOOGLE,
        })
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
    async yandexSuccess(
        @Query() user: IQueryUser,
        @Fingerprint('hashFingerprint') hashFingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        return await this.oAuthAndResponse({
            url: this.YANDEX_ACCESS_URL,
            user,
            fingerprint: hashFingerprint,
            res,
            provider: Provider.YANDEX,
        })
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
    async mailruSuccess(
        @Query() user: IQueryUser,
        @Fingerprint('hashFingerprint') hashFingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const url = this.MAILRU_ACCESS_URL + '?access_token=' + user.token

        return await this.oAuthAndResponse({
            url,
            user,
            fingerprint: hashFingerprint,
            res,
            provider: Provider.MAILRU,
        })
    }

    private async oAuthAndResponse({
        url,
        user,
        fingerprint,
        provider,
        res,
    }: IOAuth & { res: Response }) {
        const { refreshToken, ...response } = await this.oAuth2Service.oAuth({
            url,
            user,
            fingerprint,
            provider,
        })

        await this.sessionsRefreshService.createSessionAndAddRefreshToResponse({
            response: response,
            fingerprint,
            refreshToken,
            res,
        })

        return response
    }
}
