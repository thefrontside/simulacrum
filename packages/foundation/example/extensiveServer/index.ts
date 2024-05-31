import { startServerStandalone } from "../../index";
import { openapi } from "./openapi";
import { extendStore } from "./store";
import { extend } from "./extend-api";

startServerStandalone({
  port: 9999,
  openapi,
  extendStore,
  extend,
});
