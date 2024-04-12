import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { FingerprintKeys } from 'src/shared/types/auth.interface'

export interface IFingerprint {
    reqHeadersString: string
    hashFingerprint: string
}

export const Fingerprint = createParamDecorator(
    (data: keyof IFingerprint, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()

        const reqHeadersString = Object.keys(FingerprintKeys)
            .map((key) => request.headers[FingerprintKeys[key]])
            .join('-')

        const hashFingerprint = bcrypt.hashSync(reqHeadersString, 7)

        if (data === 'hashFingerprint') return hashFingerprint
        if (data === 'reqHeadersString') return reqHeadersString

        return {
            hashFingerprint,
            reqHeadersString,
        }
    },
)
