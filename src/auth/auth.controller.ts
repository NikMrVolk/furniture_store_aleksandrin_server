import {
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { AuthService } from './services/auth.service'
import { Request, Response } from 'express'
import { Access, Refresh } from './decorators/auth.decorator'
import { Fingerprint } from './decorators/fingerprint.decorator'
import { CurrentUser } from './decorators/user.decorator'
import { TokensService } from './services/tokens.service'
import {
    CookieNames,
    IAuthResponseWithoutRefresh,
    Tokens,
} from 'src/shared/types/auth.interface'
import { SessionsService } from 'src/sessions/sessions.service'
import {
    CheckMailLoginDto,
    CheckMailRegistrationDto,
    LoginDto,
    RegistrationDto,
} from './dto'
import { CookieValue } from './decorators/cookie.decorator'
import { ActivationService } from './services/activation.service'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly activationService: ActivationService,
    ) {}

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('check-mail-registration')
    async checkMailRegistration(
        @Body() dto: CheckMailRegistrationDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Fingerprint('fingerprint') fingerprint: string,
    ) {
        await this.activationService.checkMail({
            email: dto.email,
            type: 'registration',
            userKey,
            fingerprint,
        })

        return `Код подтверждения отправлен на почту ${dto.email}`
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('registration')
    async registration(
        @Fingerprint('fingerprint') fingerprint: string,
        @Body() dto: RegistrationDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } =
            await this.authService.registration({ dto, fingerprint, userKey })

        await this.createSessionAndAddRefreshToResponse({
            response,
            fingerprint,
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
        @Fingerprint('fingerprint') fingerprint: string,
    ) {
        await this.activationService.checkMail({
            email: dto.email,
            type: 'login',
            userKey,
            fingerprint,
        })

        return `Код подтверждения отправлен на почту ${dto.email}`
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(
        @Fingerprint('fingerprint') fingerprint: string,
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
        await this.createSessionAndAddRefreshToResponse({
            response: response,
            fingerprint,
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

    // @HttpCode(200)
    // @Access()
    // @Get()
    // async getAll(): Promise<IUserWithoutPassword[]> {
    //     return this.userService.getAll()
    // }

    async createSessionAndAddRefreshToResponse({
        response,
        fingerprint,
        refreshToken,
        res,
    }: {
        response: IAuthResponseWithoutRefresh
        fingerprint: string
        refreshToken: string
        res: Response
    }): Promise<void> {
        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)
    }
}
