import { Injectable, NotFoundException } from '@nestjs/common'
import { LoginDto, RegistrationDto } from './dto'
import { IFingerprint } from 'src/utils/decorators'
import { IAuthResponse } from 'src/utils/types'
import { UsersService } from '../users/users.service'
import { TokensService } from './modules/tokens/tokens.service'
import { OtpsBaseService } from './modules/otps/services/otps-base.service'

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UsersService,
        private readonly tokensService: TokensService,
        private readonly otpsBaseService: OtpsBaseService,
    ) {}

    public async registration({
        userKey,
        dto,
        fingerprint,
    }: {
        userKey: string
        dto: RegistrationDto
        fingerprint: IFingerprint
    }): Promise<IAuthResponse> {
        await this.userService.checkingUserExistsByEmail(dto.email)

        await this.otpsBaseService.checkOtpCode({
            email: dto.email,
            otpCode: dto.otpCode,
            userKey,
            fingerprint: fingerprint.reqHeadersString,
        })

        const user = await this.userService.create(dto)

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint: fingerprint.hashFingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }

    public async login(
        dto: LoginDto,
        fingerprint: IFingerprint,
        userKey: string,
    ): Promise<IAuthResponse> {
        const user = await this.userService.getByEmail(dto.email)

        if (!user)
            throw new NotFoundException(
                `Пользователь с почтой ${dto.email} не зарегистрирован`,
            )

        await this.otpsBaseService.checkOtpCode({
            email: dto.email,
            otpCode: dto.otpCode,
            userKey,
            fingerprint: fingerprint.reqHeadersString,
        })

        const tokens = await this.tokensService.issueTokens({
            id: user.id,
            fingerprint: fingerprint.hashFingerprint,
            roles: user.roles,
        })

        return { ...user, ...tokens }
    }
}
