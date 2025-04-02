import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, url, originalUrl } = req;
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    res.on('finish', () => {
      const { statusCode } = res;
      // Log the request method, URL, status code, user agent, and client IP address
      const message = `[${method}] ${originalUrl} ${statusCode} ${userAgent} ${ip}`;
      this.logger.log(message);
    });

    next();
  }
}
