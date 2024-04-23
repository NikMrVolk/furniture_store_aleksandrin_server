import { ApiProperty } from '@nestjs/swagger'

export class SuspiciousQueriesDto {
    @ApiProperty({
        required: false,
        description: 'Search by email address',
        example: 'nick',
    })
    searchMail?: string

    @ApiProperty({
        required: false,
        description: 'Order by, either "asc" or "desc"',
        enum: ['asc', 'desc'],
        example: 'asc',
    })
    orderBy: 'asc' | 'desc'
}
