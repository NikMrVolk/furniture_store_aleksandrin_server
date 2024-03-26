import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import * as bcrypt from 'bcrypt'
import { UserService } from '../user.service'
import { FingerprintKeys } from '../auth.types'

const throwError = () => {
    throw new UnauthorizedException('Invalid access token')
}

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly userService: UserService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        await super.canActivate(context)

        const request = context.switchToHttp().getRequest()
        const token = request.headers.authorization?.split(' ')[1]

        const stringMetaDataToFingerprint = Object.keys(FingerprintKeys)
            .map((key) => request.headers[FingerprintKeys[key]])
            .join('-')

        if (token) {
            try {
                const { fingerprint, id } = this.jwt.verify(token)
                const { sessions } = await this.userService.getUserSessions(id)

                const currentSession = sessions.find(
                    (el) => el.accessToken === token,
                )
                if (!currentSession) throwError()
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

        return false
    }
}
