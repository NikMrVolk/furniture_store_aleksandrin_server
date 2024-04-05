import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import { LoginUserDto } from '../dto/login-user.dto'
import { UserService } from './user.service'
import * as bcrypt from 'bcrypt'
import { CreateUserDto } from '../dto/create-user.dto'
import {
    IAuthResponse,
    IAuthResponseWithoutRefresh,
} from 'src/shared/types/auth.interface'
import { TokensService } from './tokens.service'
import { SessionsService } from './sessions.service'
import { Response } from 'express'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tokensService: TokensService,
        private readonly sessionsService: SessionsService,
    ) {}

    async registration(
        dto: CreateUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        const oldUser = await this.userService.getByEmail(dto.email)

        if (oldUser)
            throw new ConflictException(
                `Пользователь с почтой ${dto.email} уже существует`,
            )

        const { password, ...user } = await this.userService.create(dto)

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    async login(
        dto: LoginUserDto,
        fingerprint: string,
    ): Promise<IAuthResponse> {
        const { password, ...user } = await this.validateUser(dto)
        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    private async validateUser(dto: LoginUserDto) {
        const user = await this.userService.getByEmail(dto.email)

        if (!user)
            throw new NotFoundException(
                `Пользователь с почтой ${dto.email} не зарегистрирован`,
            )

        const comparePassword = bcrypt.compareSync(dto.password, user.password)

        if (!comparePassword)
            throw new UnauthorizedException('Не верный пароль')

        return user
    }

    async createSessionAndAddRefreshToResponse({
        response,
        fingerprint,
        refreshToken,
        res,
        isCheckQuantitySessions = false,
    }: {
        response: IAuthResponseWithoutRefresh
        fingerprint: string
        refreshToken: string
        res: Response
        isCheckQuantitySessions?: boolean
    }): Promise<void> {
        if (isCheckQuantitySessions) {
            await this.sessionsService.checkQuantitySessions(response.id)
        }

        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)
    }
}