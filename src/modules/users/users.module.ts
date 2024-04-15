import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from 'src/utils/services/prisma'

@Module({
    providers: [UsersService, PrismaService],
    exports: [UsersService],
})
export class UsersModule {}
