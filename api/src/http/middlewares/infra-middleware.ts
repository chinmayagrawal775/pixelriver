import { NextFunction, Request, Response } from "express";
import { InfraServices } from "../../infra/types.js";

declare global {
  namespace Express {
    interface Request {
      services: InfraServices;
    }
  }
}

export const infraMiddleware = (infraServices: InfraServices) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.services = infraServices;

    next();
  };
};
