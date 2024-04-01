import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { AuthService } from './services/auth.service'
import { UserService } from './services/user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import {
    IAuthResponseWithoutRefresh,
    IUserWithoutPassword,
    Tokens,
} from './auth.types'
import { Request, Response } from 'express'
import { Access, Google, Refresh, Yandex } from './decorators/auth.decorator'
import { Fingerprint } from './decorators/fingerprint.decorator'
import { CurrentUser } from './decorators/user.decorator'
import { SessionsService } from './services/sessions.service'
import { TokensService } from './services/tokens.service'
import { HttpService } from '@nestjs/axios'
import { mergeMap } from 'rxjs'
import { handleTimeoutAndErrors } from 'src/shared/helpers'
import { Provider } from '@prisma/client'

@Controller('auth')
export class AuthController {
    private readonly OAUTH_SUCCESS_URL: string
    private readonly GOOGLE_ACCESS_URL: string
    private readonly YANDEX_ACCESS_URL: string

    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly httpService: HttpService,
    ) {
        this.OAUTH_SUCCESS_URL = 'http://localhost:3000/oauth2'
        this.GOOGLE_ACCESS_URL =
            'https://www.googleapis.com/oauth2/v3/tokeninfo'
        this.YANDEX_ACCESS_URL = 'https://login.yandex.ru/info'
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('registration')
    async registration(
        @Fingerprint('fingerprint') fingerprint: string,
        @Body() dto: CreateUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } =
            await this.authService.registration(dto, fingerprint)

        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(
        @Fingerprint('fingerprint') fingerprint: string,
        @Body() dto: LoginUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } = await this.authService.login(
            dto,
            fingerprint,
        )

        await this.sessionsService.checkQuantitySessions(response.id)
        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @HttpCode(200)
    @Refresh()
    @Post('login/access-token')
    async loginRefresh(
        @Req() req: Request,
        @Fingerprint('fingerprint') fingerprint: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const refreshTokenFromCookies = req.cookies[Tokens.REFRESH_TOKEN_NAME]

        if (!refreshTokenFromCookies) {
            this.tokensService.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Refresh token not passed')
        }

        const { refreshToken, ...response } =
            await this.tokensService.getNewTokens(
                refreshTokenFromCookies,
                fingerprint,
            )

        await this.sessionsService.addNewTokensToDB({
            oldRefreshToken: refreshTokenFromCookies,
            refreshToken,
            userId: response.id,
            accessToken: response.accessToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @HttpCode(200)
    @Post('auto-logout')
    async autoLogout(@Res({ passthrough: true }) res: Response) {
        this.tokensService.removeRefreshTokenFromResponse(res)
    }

    @HttpCode(200)
    @Access()
    @Post('user-logout')
    async logout(
        @Req() req: Request,
        @CurrentUser('id') userId: number,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshTokenFromCookies = req.cookies[Tokens.REFRESH_TOKEN_NAME]

        this.sessionsService.deleteSessionByRefreshToken(
            userId,
            refreshTokenFromCookies,
        )
        this.tokensService.removeRefreshTokenFromResponse(res)
    }

    @HttpCode(200)
    @Access()
    @Get()
    async getAll(): Promise<IUserWithoutPassword[]> {
        return this.userService.getAll()
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
                mergeMap(async ({ data }) => {
                    const { refreshToken, ...response } =
                        await this.authService.oAuth({
                            email: data.email,
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
    successYandex(
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
                        await this.authService.oAuth({
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
}
