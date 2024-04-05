import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import * as cookieParser from 'cookie-parser'

const start = async () => {
    try {
        const PORT = process.env.PORT
        const app = await NestFactory.create(AppModule)

        app.setGlobalPrefix('api')
        app.use(cookieParser())
        app.enableCors({
            origin: [/https:\/\/[a-z0-9\.]*onrender\.com/],
            credentials: true,
            exposedHeaders: 'set-cookie',
        })

        await app.listen(PORT, () =>
            console.log(`App started work on port ${PORT}`),
        )
    } catch (e) {
        console.log(e)
    }
}

start()
