import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Provider } from '@prisma/client'
import { Strategy } from 'passport-google-oauth20'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
            clientID: process.env.GOOGLE_APP_ID,
            clientSecret: process.env.GOOGLE_APP_SECRET,
            callbackURL: `${process.env.SERVER_URL}/api/oauth2/${Provider.GOOGLE.toLowerCase()}/callback`,
            scope: ['email', 'profile'],
        })
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile,
        done: (err: any, user: any, info?: any) => void,
    ): Promise<any> {
        const { name, emails } = profile
        const user = {
            email: emails[0].value,
            name: name.givenName,
            surname: name.familyName,
            accessToken,
        }
        done(null, user)
    }
}
