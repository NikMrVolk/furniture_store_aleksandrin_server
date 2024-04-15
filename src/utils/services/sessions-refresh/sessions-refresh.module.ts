import { Module } from '@nestjs/common'
import { SessionsRefreshService } from './sessions-refresh.service'
import { SessionsModule } from 'src/modules/auth/modules/sessions/sessions.module'
import { TokensModule } from 'src/modules/auth/modules/tokens/tokens.module'

@Module({
    imports: [SessionsModule, TokensModule],
    providers: [SessionsRefreshService],
    exports: [SessionsRefreshService],
})
export class SessionsRefreshModule {}
