import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from '../auth.service'
import * as bcrypt from 'bcrypt'
import { Tokens } from '../auth.types'
import { UserService } from '../user.service'

const throwError = () => {
    throw new UnauthorizedException('Invalid refresh token')
}

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest()
        const token = request.cookies[Tokens.REFRESH_TOKEN_NAME]

        const metaDataToFingerprint = this.authService.getMetaDataToFingerprint(
            request.headers,
        )

        if (token) {
            try {
                const { id } = this.jwt.verify(token)

                const { sessions } = await this.userService.getUserSessions(id)
                if (!sessions.length) throwError()

                const currentSession = sessions.find(
                    (el) => el.refreshToken === token,
                )
                if (!currentSession) throwError()

                const hashResult = await bcrypt.compare(
                    metaDataToFingerprint,
                    currentSession.fingerprint,
                )

                if (!hashResult) {
                    await this.authService.deleteSession(currentSession.id)
                    throwError()
                }

                return true
            } catch {
                throwError()
            }
        }

        return false
    }
}
