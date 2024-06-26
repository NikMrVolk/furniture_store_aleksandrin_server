import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import * as bcrypt from 'bcrypt'
import { FingerprintKeys, IJwtPayload } from '../types'
import { UsersService } from 'src/modules/users/users.service'
import { SessionsService } from 'src/modules/auth/modules/sessions/sessions.service'

const throwError = () => {
    throw new UnauthorizedException('Invalid access token')
}

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly userService: UsersService,
        private readonly sessionsService: SessionsService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        await super.canActivate(context)

        const { headers } = context.switchToHttp().getRequest()
        const token = headers.authorization?.split(' ')[1]

        const stringMetaDataToFingerprint = Object.keys(FingerprintKeys)
            .map((key) => headers[FingerprintKeys[key]])
            .join('-')

        if (token) {
            try {
                const { fingerprint, id } = this.jwt.verify<IJwtPayload>(token)
                const { sessions } = await this.userService.getUserSessions(id)

                const currentSession = sessions.find(
                    (el) => el.accessToken === token,
                )
                if (!currentSession) throwError()

                const isSessionExpired =
                    await this.sessionsService.checkExpiredSession(
                        currentSession,
                    )
                if (isSessionExpired) throwError()

                if (
                    bcrypt.compareSync(stringMetaDataToFingerprint, fingerprint)
                ) {
                    return true
                } else {
                    throwError()
                }
            } catch {
                throwError()
            }
        }

        throwError()
    }
}
