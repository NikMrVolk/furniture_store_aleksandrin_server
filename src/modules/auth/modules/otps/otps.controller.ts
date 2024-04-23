import { Controller, Get, Query } from '@nestjs/common'
import { OtpsManageService } from './services'
import { Admin } from 'src/utils/decorators'
import { ApiTags } from '@nestjs/swagger'
import { GetAllSuspiciousSwagger } from './decorators'
import { SuspiciousDto, SuspiciousQueriesDto } from './dto'

// todo add admin guard
// @Admin()
@ApiTags('📬 otps')
@Controller('otps')
export class OtpsController {
    constructor(private readonly otpsManageService: OtpsManageService) {}

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
}
