import { ApiProperty } from '@nestjs/swagger'

export class SuspiciousQueriesDto {
    @ApiProperty({
        required: false,
        description: 'Search by email address',
    })
    searchMail?: string

    @ApiProperty({
        required: false,
        description: 'Order by, either "asc" or "desc"',
    })
    orderBy: 'asc' | 'desc'

    @ApiProperty({
        required: false,
        description: 'Page number',
    })
    page?: number

    @ApiProperty({
        required: false,
        description: 'Page size',
    })
    pageSize?: number
}
