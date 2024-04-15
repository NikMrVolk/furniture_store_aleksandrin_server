import { Injectable } from '@nestjs/common'
import { Response } from 'express'
import { SessionsService } from 'src/modules/auth/modules/sessions/sessions.service'
import { TokensService } from 'src/modules/auth/modules/tokens/tokens.service'
import { IAuthResponseWithoutRefresh } from 'src/utils/types'

@Injectable()
export class SessionsRefreshService {
    constructor(
        private readonly sessionsService: SessionsService,
        private readonly tokensService: TokensService,
    ) {}
    public async createSessionAndAddRefreshToResponse({
        response,
        fingerprint,
        refreshToken,
        res,
    }: {
        response: IAuthResponseWithoutRefresh
        fingerprint: string
        refreshToken: string
        res: Response
    }): Promise<void> {
        await this.sessionsService.createSession({
            userId: response.id,
            fingerprint,
            accessToken: response.accessToken,
            refreshToken,
        })

        this.tokensService.addRefreshTokenToResponse(res, refreshToken)
    }
}
