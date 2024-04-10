import { IsEmail } from 'class-validator'

export class LoginUserDto {
    @IsEmail({}, { message: 'Проверьте введённую почту' })
    readonly email: string
}
