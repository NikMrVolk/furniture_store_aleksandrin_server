import {
    Body,
    Controller,
    HttpCode,
    NotFoundException,
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
import { LoginDto, OtpsCreateDto, RegistrationDto } from './dto'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { SessionsService } from './modules/sessions/sessions.service'
import { TokensService } from './modules/tokens/tokens.service'
import { OtpsBaseService } from './modules/otps/services/otps-base.service'
import { UsersService } from '../users/users.service'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UsersService,
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
        private readonly otpsBaseService: OtpsBaseService,
    ) {}

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('otps/create')
    public async createOtp(
        @Body() dto: OtpsCreateDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Fingerprint() fingerprint: IFingerprint,
    ) {
        await this.checkMail({
            email: dto.email,
            type: dto.type,
        })

        await this.otpsBaseService.getAndSendOtp({
            email: dto.email,
            userKey,
            fingerprint,
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

        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint: fingerprint.hashFingerprint,
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
        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint: fingerprint.hashFingerprint,
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

    private async checkMail({
        email,
        type,
    }: {
        email: string
        type: 'login' | 'registration'
    }) {
        if (type === 'registration') {
            await this.userService.checkingUserExistsByEmail(email)
        }

        if (type === 'login') {
            const user = await this.userService.getByEmail(email)

            if (!user) {
                throw new NotFoundException(
                    `Пользователь с почтой ${email} не зарегистрирован`,
                )
            }
        }
    }
}
