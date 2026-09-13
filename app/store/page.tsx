import StoreRoute from "./store-route";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  return <StoreRoute view="overview" />;
}
