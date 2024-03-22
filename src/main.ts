import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'

const start = async () => {
    try {
        const PORT = process.env.PORT || 4000
        const app = await NestFactory.create(AppModule)

        app.setGlobalPrefix('api')

        await app.listen(PORT, () =>
            console.log(`App started work on port ${PORT}`),
        )
    } catch (e) {
        console.log(e)
    }
}

start()
