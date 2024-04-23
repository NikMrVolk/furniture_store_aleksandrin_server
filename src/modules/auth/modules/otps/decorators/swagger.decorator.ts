import { applyDecorators } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SuspiciousDto } from '../dto'

export function GetAllSuspiciousSwagger() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get suspicious records',
            description:
                'Request to get all suspicious records or filter and sort this data with search email string and order by.',
        }),
        ApiBearerAuth(),
        ApiResponse({
            status: 200,
            description:
                'The suspicious records have been retrieved successfully.',
            type: [SuspiciousDto],
        }),
    )
}
