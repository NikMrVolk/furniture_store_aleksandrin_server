import { Module } from '@nestjs/common'
import { FavoritesService } from './favorites.service'
import { PrismaService } from 'src/prisma.service'
import { FavoritesController } from './favorites.controller'

@Module({
    controllers: [FavoritesController],
    providers: [FavoritesService, PrismaService],
    exports: [FavoritesService],
})
export class FavoritesModule {}
