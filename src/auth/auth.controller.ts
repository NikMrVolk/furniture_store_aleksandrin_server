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
import { IAuthResponseWithoutRefresh, IUserWithoutPassword } from './auth.types'
import { Request, Response } from 'express'
import { Auth } from './decorators/auth.decorator'
import { CurrentUser } from './decorators/user.decorator'
import { User } from '@prisma/client'

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
        @Body() dto: CreateUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } =
            await this.authService.registration(dto)

        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('login')
    async login(
        @Body() dto: LoginUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const { refreshToken, ...response } = await this.authService.login(dto)

        this.authService.addRefreshTokenToResponse(res, refreshToken)

        return response
    }

    @HttpCode(200)
    @Post('login/access-token')
    async loginRefresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<IAuthResponseWithoutRefresh> {
        const refreshTokenFromCookies =
            req.cookies[this.authService.REFRESH_TOKEN_NAME]

        if (!refreshTokenFromCookies) {
            this.authService.removeRefreshTokenFromResponse(res)
            throw new UnauthorizedException('Refresh token not passed')
        }

        const { refreshToken, ...response } =
            await this.authService.getNewTokens(refreshTokenFromCookies)

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
    async getAll(@CurrentUser() user: User): Promise<IUserWithoutPassword[]> {
        console.log(user)
        return this.userService.getAll()
    }
}
