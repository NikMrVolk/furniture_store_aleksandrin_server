import { AppModule } from './app.module'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import * as cookieParser from 'cookie-parser'

const start = async () => {
    try {
        const PORT = process.env.PORT
        const app = await NestFactory.create(AppModule)

        app.setGlobalPrefix('api')
        app.use(cookieParser())
        app.enableCors({
            origin: process.env.CLIENT_URL,
            credentials: true,
            exposedHeaders: 'set-cookie',
        })

        const config = new DocumentBuilder()
            .setTitle('Furniture store AleksandriN')
            .setDescription('REST API Documentation')
            .setVersion('1.0.0')
            .addTag('AleksandriN')
            .build()
        const document = SwaggerModule.createDocument(app, config, {
            ignoreGlobalPrefix: false,
        })
        SwaggerModule.setup('/api/docs', app, document)

        await app.listen(PORT, () =>
            console.log(`App started work on port ${PORT}`),
        )
    } catch (e) {
        console.log(e)
    }
}

start()
