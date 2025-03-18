import { NextFunction, Request, Response } from "express";
import { InfraServices } from "../../infra/types.js";

// declaring gloabl types for adding the services object in req
declare global {
  namespace Express {
    interface Request {
      services: InfraServices;
    }
  }
}

// this middleware will add the infra services to the request object
export const infraMiddleware = (infraServices: InfraServices) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.services = infraServices;

    next();
  };
};
