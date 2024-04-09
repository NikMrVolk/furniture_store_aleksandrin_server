import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { OAuth2Module } from './oauth2/oauth2.module'
import { MailModule } from './mail/mail.module'
import { UserModule } from './user/user.module'
import { CartModule } from './cart/cart.module'
import { FavoritesModule } from './favorites/favorites.module'

@Module({
    imports: [
        ConfigModule.forRoot(),
        AuthModule,
        OAuth2Module,
        MailModule,
        UserModule,
        CartModule,
        FavoritesModule,
    ],
})
export class AppModule {}
