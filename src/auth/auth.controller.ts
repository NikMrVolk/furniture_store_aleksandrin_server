import { Body, Controller, Get, Post } from '@nestjs/common'
import { User } from '@prisma/client'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('registration')
    async registration(
        @Body() userData: { name?: string; email: string },
    ): Promise<User> {
        return this.authService.registration(userData)
    }

    @Get()
    async getAll(): Promise<User[]> {
        return this.authService.getAll()
    }
}
