import "server-only";
import { createServerAppAdapter } from "@/vendor/aerocore-app-adapter/server";
import { AV_PORTRAIT_APP_ID } from "./config";

export function getAeroVistaServerAdapter() {
  const identityGatewaySecret = process.env.IDGW_SERVICE_SECRET_AV_PORTRAIT;
  if (!identityGatewaySecret) {
    throw new Error("AV Portrait identity service credential is not configured.");
  }

  return createServerAppAdapter({
    appId: AV_PORTRAIT_APP_ID,
    identityGatewayOrigin: process.env.IDENTITY_GATEWAY_ORIGIN || "https://identity-api.aerovista.us",
    identityGatewaySecret,
  });
}
