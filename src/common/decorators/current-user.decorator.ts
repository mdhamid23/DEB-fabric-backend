import { getCurrentUser } from "@/common/helpers/auth.helper";
import { IRequest } from "@/common/interfaces/request.interface";
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext) => {
    const req: IRequest = context.switchToHttp().getRequest();
    const user = getCurrentUser(req);
    if (typeof user === "string") throw new UnauthorizedException(user);
    return user;
  },
);

// V2-Get optional current user
/**
 * An optional decorator to get the currently authenticated user.
 * Returns the user object if found, otherwise returns null. Does NOT throw an error.
 */
export const OptionalCurrentUser = createParamDecorator(
  (_, context: ExecutionContext) => {
    const req: IRequest = context.switchToHttp().getRequest();
    const user = getCurrentUser(req);
    if (typeof user === "string") return null;
    return user;
  },
);
