import { IsEmail } from 'class-validator'

export class CheckMailLoginDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string

}
