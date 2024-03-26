import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { LoginUserDto } from './dto/login-user.dto'
import {
    IAuthResponseWithoutRefresh,
    IUserWithoutPassword,
    Tokens,
} from './auth.types'
import { Request, Response } from 'express'
import { Access, Refresh } from './decorators/auth.decorator'
import { Fingerprint } from './decorators/fingerprint.decorator'
import { CurrentUser } from './decorators/user.decorator'

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}

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

        await this.authService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.authService.addRefreshTokenToResponse(res, refreshToken)

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

        await this.authService.checkQuantitySessions(response.id)
        await this.authService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.authService.addRefreshTokenToResponse(res, refreshToken)

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
            this.authService.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Refresh token not passed')
        }

        const { refreshToken, ...response } =
            await this.authService.getNewTokens(
                refreshTokenFromCookies,
                fingerprint,
            )

        // Re-refresh refresh token after get new AccessToken
        // this.authService.addRefreshTokenToResponse(res, refreshToken)

        await this.authService.addNewAccessTokenToDB({
            refreshTokenFromCookies,
            userId: response.id,
            accessToken: response.accessToken,
        })

        return response
    }

    @HttpCode(200)
    @Post('auto-logout')
    async autoLogout(@Res({ passthrough: true }) res: Response) {
        this.authService.removeRefreshTokenFromResponse(res)
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

        this.authService.deleteSessionByRefreshToken(
            userId,
            refreshTokenFromCookies,
        )
        this.authService.removeRefreshTokenFromResponse(res)
    }

    @HttpCode(200)
    @Access()
    @Get()
    async getAll(): Promise<IUserWithoutPassword[]> {
        return this.userService.getAll()
    }
}
