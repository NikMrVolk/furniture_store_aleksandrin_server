import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './modules/auth/auth.module'
import { MailsModule } from './modules/mails/mails.module'
import { UsersModule } from './modules/users/users.module'

@Module({
    imports: [ConfigModule.forRoot(), AuthModule, MailsModule, UsersModule],
})
export class AppModule {}
