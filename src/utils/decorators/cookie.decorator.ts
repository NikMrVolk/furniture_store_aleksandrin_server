import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CookieValue = createParamDecorator(
    (cookieName: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest()
        return request.cookies[cookieName]
    },
)
