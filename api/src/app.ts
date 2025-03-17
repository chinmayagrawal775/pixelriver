import "dotenv/config";
import { getInfraServices } from "./infra/getInfraServices.js";

const infraServices = await getInfraServices();

console.log("server is serving");
