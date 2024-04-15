import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import * as bcrypt from 'bcrypt'
import { FingerprintKeys, IJwtPayload, Tokens } from '../types'
import { UsersService } from 'src/modules/users/users.service'
import { SessionsService } from 'src/modules/auth/modules/sessions/sessions.service'

const throwError = () => {
    throw new UnauthorizedException('Invalid refresh token')
}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly userService: UsersService,
        private readonly sessionsService: SessionsService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest()
        const token = request.cookies[Tokens.REFRESH_TOKEN_NAME]

        const stringMetaDataToFingerprint = Object.keys(FingerprintKeys)
            .map((key) => request.headers[FingerprintKeys[key]])
            .join('-')

        if (token) {
            try {
                const { id } = this.jwt.verify<IJwtPayload>(token)

                const { sessions } = await this.userService.getUserSessions(id)
                if (!sessions.length) throwError()

                const currentSession = sessions.find(
                    (el) => el.refreshToken === token,
                )
                if (!currentSession) throwError()

                const hashResult = await bcrypt.compare(
                    stringMetaDataToFingerprint,
                    currentSession.fingerprint,
                )

                if (!hashResult) {
                    await this.sessionsService.deleteSessionById(
                        currentSession.id,
                    )
                    throwError()
                }

                return true
            } catch {
                throwError()
            }
        }

        throwError()
    }
}
