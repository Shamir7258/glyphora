import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SuccessView } from "@/components/checkout/success-view";

export const metadata: Metadata = { title: "Order Confirmation" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  if (!order) redirect("/cart");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
      <SuccessView orderNumber={order} />
    </div>
  );
}
