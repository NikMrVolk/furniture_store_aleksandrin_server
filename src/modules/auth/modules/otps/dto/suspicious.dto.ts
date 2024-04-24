import { ApiProperty } from '@nestjs/swagger'

export class SuspiciousDto {
    @ApiProperty({
        required: true,
        description: 'The id of the suspicious record',
        example: 12,
    })
    readonly id: number

    @ApiProperty({
        required: true,
        description: 'The email of the suspicious record',
        example: 'a@a.com b@b.com',
        type: String,
    })
    readonly emails: string

    @ApiProperty({
        required: true,
        description: 'Last time the suspicious record was updated',
        example: '2022-01-01T00:00:00.000Z',
    })
    readonly updatedAt: Date
}
