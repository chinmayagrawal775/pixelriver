import "dotenv/config";
import { getHttpServer } from "./http/server.js";
import { getInfraServices } from "./infra/getInfraServices.js";

// boot up the infra services
const infraServices = await getInfraServices();

// boot up the http server
const httpServer = await getHttpServer(infraServices);

// TODO: Add handle gracefule shutdown logic

console.log("server is serving");
