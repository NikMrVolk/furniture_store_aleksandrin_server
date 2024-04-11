import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { IAuthResponse } from 'src/shared/types/auth.interface'
import { TokensService } from './tokens.service'
import { UserService } from 'src/user/user.service'
import { LoginDto, RegistrationDto } from '../dto'
import { ActivationService } from './activation.service'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly tokensService: TokensService,
        private readonly activationService: ActivationService,
    ) {}

    public async registration({
        userKey,
        dto,
        fingerprint,
    }: {
        userKey: string
        dto: RegistrationDto
        fingerprint: string
    }): Promise<IAuthResponse> {
        await this.userService.checkingUserExistsByEmail(dto.email)
        await this.activationService.checkActivationCode({
            email: dto.email,
            activationCode: dto.activationCode,
            userKey,
        })

        const user = await this.userService.create(dto)

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    public async login(
        dto: LoginDto,
        fingerprint: string,
        userKey: string,
    ): Promise<IAuthResponse> {
        const user = await this.userService.getByEmail(dto.email)

        if (!user)
            throw new NotFoundException(
                `Пользователь с почтой ${dto.email} не зарегистрирован`,
            )

        await this.activationService.checkActivationCode({
            email: dto.email,
            activationCode: dto.activationCode,
            userKey,
        })

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }
}
