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
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private jwt: JwtService,
        private readonly authService: AuthService,
    ) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        await super.canActivate(context)

        const request = context.switchToHttp().getRequest()
        const token = request.headers.authorization?.split(' ')[1]

        const metaDataToFingerprint = this.authService.getMetaDataToFingerprint(
            request.headers
        )

        if (token) {
            try {
                const { fingerprint } = this.jwt.verify(token)
                if (bcrypt.compareSync(metaDataToFingerprint, fingerprint)) {
                    return true
                } else {
                    throw new UnauthorizedException('Неизвестное устройство')
                }
            } catch {
                throw new UnauthorizedException('Invalid access token')
            }
        }

        return false
    }
}
