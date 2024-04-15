import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthGuard } from '@nestjs/passport'
import { $Enums } from '@prisma/client'
import { IJwtPayload } from '../types'

const throwError = () => {
    throw new ForbiddenException('Not enough rights')
}

@Injectable()
export class JwtAdminGuard extends AuthGuard('jwt') {
    constructor(private jwt: JwtService) {
        super()
    }

    async canActivate(context: ExecutionContext) {
        const { headers } = context.switchToHttp().getRequest()
        const token = headers.authorization?.split(' ')[1]

        if (token) {
            try {
                const { roles } = this.jwt.verify<IJwtPayload>(token)
                if (roles.includes($Enums.Role.ADMIN)) {
                    return true
                }
                throwError()
            } catch {
                throwError()
            }
        }

        throwError()
    }
}
