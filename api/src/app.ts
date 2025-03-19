import "dotenv/config";
import { getHttpServer } from "./http/server.js";
import { getInfraServices } from "./infra/getInfraServices.js";

// boot up the infra services
const infraServices = await getInfraServices();
console.log(`Infra services initialized`);

// boot up the http server
const httpServer = await getHttpServer(infraServices);
console.log(`Http server initialized at: http://127.0.0.1:${process.env.PORT}/`);

// TODO: Add handle gracefule shutdown logic
