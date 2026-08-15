import { SquareClient, SquareEnvironment } from "square";

export function squareEnvironment() {
  return process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
}

export function squarePublicConfig() {
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const locationId = process.env.SQUARE_LOCATION_ID ?? "";
  const sandbox = squareEnvironment() === SquareEnvironment.Sandbox;
  return {
    applicationId,
    locationId,
    sandbox,
    configured: Boolean(applicationId && locationId && process.env.SQUARE_ACCESS_TOKEN),
  };
}

export function getSquareClient() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) return null;
  return new SquareClient({
    token,
    environment: squareEnvironment(),
  });
}

export function dollarsToCents(amount: number) {
  return BigInt(Math.round(amount * 100));
}
