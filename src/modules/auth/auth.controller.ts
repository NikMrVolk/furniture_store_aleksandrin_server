import {
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    Res,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import {
    Access,
    CookieValue,
    CurrentUser,
    Fingerprint,
    IFingerprint,
    Refresh,
} from 'src/utils/decorators'
import {
    CookieNames,
    IAuthResponseWithoutRefresh,
    Tokens,
} from 'src/utils/types'
import {
    CheckMailLoginDto,
    CheckMailRegistrationDto,
    LoginDto,
    RegistrationDto,
} from './dto'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { SessionsService } from './modules/sessions/sessions.service'
import { TokensService } from './modules/tokens/tokens.service'
import { OtpsBaseService } from './modules/otps/services/otps-base.service'
import { SessionsRefreshService } from 'src/utils/services/sessions-refresh/sessions-refresh.service'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly otpsBaseService: OtpsBaseService,
        private readonly sessionsRefreshService: SessionsRefreshService,
    ) {}

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('check-mail-registration')
    async checkMailRegistration(
        @Body() dto: CheckMailRegistrationDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Fingerprint() fingerprint: IFingerprint,
    ) {
        await this.otpsBaseService.checkMail({
            email: dto.email,
            type: 'registration',
            userKey,
            fingerprint: fingerprint,
        })

        return `Код подтверждения отправлен на почту ${dto.email}`
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('registration')
    async registration(
        @Fingerprint() fingerprint: IFingerprint,
        @Body() dto: RegistrationDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } =
            await this.authService.registration({ dto, fingerprint, userKey })

        await this.sessionsRefreshService.createSessionAndAddRefreshToResponse({
            response,
            fingerprint: fingerprint.hashFingerprint,
            refreshToken,
            res,
        })

        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('check-mail-login')
    async checkMail(
        @Body() dto: CheckMailLoginDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Fingerprint() fingerprint: IFingerprint,
    ) {
        await this.otpsBaseService.checkMail({
            email: dto.email,
            type: 'login',
            userKey,
            fingerprint: fingerprint,
        })

        return `Код подтверждения отправлен на почту ${dto.email}`
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(
        @Fingerprint() fingerprint: IFingerprint,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } = await this.authService.login(
            dto,
            fingerprint,
            userKey,
        )
        await this.sessionsService.checkQuantitySessions(response.id)
        await this.sessionsRefreshService.createSessionAndAddRefreshToResponse({
            response: response,
            fingerprint: fingerprint.hashFingerprint,
            refreshToken,
            res,
        })

        return response
    }

    @HttpCode(200)
    @Refresh()
    @Post('login/access-token')
    async loginRefresh(
        @Req() req: Request,
        @Fingerprint() fingerprint: IFingerprint,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const refreshTokenFromCookies = req.cookies[Tokens.REFRESH_TOKEN_NAME]

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

    // @HttpCode(200)
    // @Access()
    // @Get()
    // async getAll(): Promise<IUserWithoutPassword[]> {
    //     return this.userService.getAll()
    // }
}
