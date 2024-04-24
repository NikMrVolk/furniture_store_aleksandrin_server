import {
    Body,
    Controller,
    Get,
    HttpCode,
    NotFoundException,
    Post,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { OtpsBaseService, OtpsManageService } from './services'
import {
    Admin,
    CookieValue,
    Fingerprint,
    IFingerprint,
} from 'src/utils/decorators'
import { ApiTags } from '@nestjs/swagger'
import { GetAllSuspiciousSwagger } from './decorators'
import { OtpCreateDto, SuspiciousDto, SuspiciousQueriesDto } from './dto'
import { CookieNames } from 'src/utils/types'
import { UsersService } from 'src/modules/users/users.service'

@ApiTags('📬 otps')
@Controller('otps')
export class OtpsController {
    constructor(
        private readonly otpsManageService: OtpsManageService,
        private readonly otpsBaseService: OtpsBaseService,
        private readonly usersService: UsersService,
    ) {}

    @UsePipes(new ValidationPipe())
    @HttpCode(200)
    @Post('create')
    public async createOtp(
        @Body() dto: OtpCreateDto,
        @CookieValue(CookieNames.UNAUTHORIZED_USER_KEY) userKey: string,
        @Fingerprint() fingerprint: IFingerprint,
    ) {
        await this.commonCheckingMail({
            email: dto.email,
            type: dto.type,
        })

        await this.otpsBaseService.getAndSendOtp({
            email: dto.email,
            userKey,
            fingerprint,
        })

        return `Код подтверждения отправлен на почту ${dto.email}`
    }

    // todo add admin guard
    // @Admin()
    @Get('suspicious')
    @GetAllSuspiciousSwagger()
    async getAllSuspicious(
        @Query() { searchMail, orderBy }: SuspiciousQueriesDto,
    ): Promise<SuspiciousDto[]> {
        return await this.otpsManageService.getAllSuspicious({
            searchMail,
            orderBy,
        })
    }

    private async commonCheckingMail({
        email,
        type,
    }: {
        email: string
        type: 'login' | 'registration'
    }) {
        if (type === 'registration') {
            await this.usersService.checkingUserExistsByEmail(email)
        }

        if (type === 'login') {
            const user = await this.usersService.getByEmail(email)

            if (!user) {
                throw new NotFoundException(
                    `Пользователь с почтой ${email} не зарегистрирован`,
                )
            }
        }
    }
}
