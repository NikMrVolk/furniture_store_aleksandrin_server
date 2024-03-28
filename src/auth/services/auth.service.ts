import {
    BadRequestException,
    ConflictException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import { LoginUserDto } from '../dto/login-user.dto'
import { UserService } from './user.service'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { CreateUserDto } from '../dto/create-user.dto'
import { IAuthResponse, IJwt, IJwtPayload } from '../auth.types'
import { SessionsService } from './sessions.service'
import { Provider } from '@prisma/client'

@Injectable()
export class AuthService {
    EXPIRE_DAY_REFRESH_TOKEN = 15

    constructor(
        private userService: UserService,
        private jwt: JwtService,
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

        const tokens = await this.issueTokens({
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
        const tokens = await this.issueTokens({
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

    private async issueTokens({
        id,
        fingerprint,
        roles,
    }: IJwtPayload): Promise<IJwt> {
        const data = { id, fingerprint, roles }

        const accessToken = this.jwt.sign(data, {
            expiresIn: '1h',
        })

        const refreshToken = this.jwt.sign(data, {
            expiresIn: '15d',
        })

        return { accessToken, refreshToken }
    }

    async oAuth({
        email,
        fingerprint,
        provider,
    }: {
        email: string
        fingerprint: string
        provider: Provider
    }): Promise<IAuthResponse> {
        const userExist = await this.userService.getByEmail(email)

        if (userExist) {
            await this.sessionsService.checkQuantitySessions(userExist.id)
            const tokens = await this.issueTokens({
                id: userExist.id,
                roles: userExist.roles,
                fingerprint,
            })
            return { ...userExist, ...tokens }
        }

        const user = await this.userService.createByOAuth({ email, provider })
    
        if (!user) {
            throw new HttpException(
                `Не получилось создать пользователя с почтой ${email} в ${provider.toLowerCase()}`,
                HttpStatus.BAD_REQUEST,
            )
        }

        const tokens = await this.issueTokens({
            id: user.id,
            roles: user.roles,
            fingerprint,
        })

        return { ...user, ...tokens }
    }
}
