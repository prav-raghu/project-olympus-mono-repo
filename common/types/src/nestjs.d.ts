import { type AzureAuthenticatedUser } from './dto/auth.dto';

declare global {
    namespace Express {
        interface Request {
            user?: AzureAuthenticatedUser;
        }
    }
}
