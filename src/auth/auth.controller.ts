import {
    Body,
    Controller,
    Get,
    Headers,
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
import { IAuthResponseWithoutRefresh, IUserWithoutPassword } from './auth.types'
import { Request, Response } from 'express'
import { Auth } from './decorators/auth.decorator'

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
        @Headers() headers: Record<string, string>,
        @Body() dto: CreateUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const fingerprint = await this.authService.hashFingerprint(headers)

        const { refreshToken, ...response } =
            await this.authService.registration(dto, fingerprint)

        this.authService.createSession(response.id, fingerprint, refreshToken)
        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(
        @Headers() headers: Record<string, string>,
        @Body() dto: LoginUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const fingerprint = await this.authService.hashFingerprint(headers)

        const { refreshToken, ...response } = await this.authService.login(
            dto,
            fingerprint,
        )

        this.authService.createSession(response.id, fingerprint, refreshToken)
        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @HttpCode(200)
    @Post('login/access-token')
    async loginRefresh(
        @Req() req: Request,
        @Headers() headers: Record<string, string>,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const fingerprint = await this.authService.hashFingerprint(headers)
        const refreshTokenFromCookies =
            req.cookies[this.authService.REFRESH_TOKEN_NAME]

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

        return response
    }

    @HttpCode(200)
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        this.authService.removeRefreshTokenFromResponse(res)
    }

    @HttpCode(200)
    @Auth()
    @Get()
    async getAll(): Promise<IUserWithoutPassword[]> {
        return this.userService.getAll()
    }
}
