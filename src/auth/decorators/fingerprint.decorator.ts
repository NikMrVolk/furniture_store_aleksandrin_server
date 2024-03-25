import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import { FingerprintKeys } from '../auth.types'
import * as bcrypt from 'bcrypt'

interface IFingerprint {
    reqHeadersString: string
    fingerprint: string
}

export const Fingerprint = createParamDecorator(
    (data: keyof IFingerprint, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()

        const reqHeadersString = Object.keys(FingerprintKeys)
            .map((key) => request.headers[FingerprintKeys[key]])
            .join('-')

        const fingerprint = bcrypt.hashSync(reqHeadersString, 7)

        if (data === 'fingerprint') return fingerprint
        if (data === 'reqHeadersString') return reqHeadersString

        return data
    },
)
