import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import { AuthService } from '../auth.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly authService: AuthService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        await super.canActivate(context)

        const { headers } = context.switchToHttp().getRequest()
        const token = headers.authorization?.split(' ')[1]

        const metaDataToFingerprint =
            this.authService.getMetaDataToFingerprint(headers)

        if (token) {
            try {
                const { fingerprint } = this.jwt.verify(token)
                if (bcrypt.compareSync(metaDataToFingerprint, fingerprint)) {
                    return true
                } else {
                    throw new UnauthorizedException('Invalid access token')
                }
            } catch {
                throw new UnauthorizedException('Invalid access token')
            }
        }

        return false
    }
}
