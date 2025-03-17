import "dotenv/config";
import { getHttpServer } from "./http/server.js";
import { getInfraServices } from "./infra/getInfraServices.js";

const infraServices = await getInfraServices();
const httpServer = await getHttpServer(infraServices);

console.log("server is serving");
