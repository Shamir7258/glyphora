"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { designerProfileUpdateSchema, type DesignerProfileUpdateInput } from "@/types/schemas/seller.schema";

export function SettingsForm({
  initial,
}: {
  initial: {
    displayName: string;
    bio: string;
    website: string;
    avatarUrl: string;
    coverImageUrl: string;
    socialLinks: { twitter: string; instagram: string; behance: string; dribbble: string };
    payoutMethod: string;
    payoutDetails: string;
  };
}) {
  const router = useRouter();
  const form = useForm<DesignerProfileUpdateInput>({
    resolver: zodResolver(designerProfileUpdateSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: DesignerProfileUpdateInput) {
    try {
      await apiFetch("/api/seller/profile", { method: "PATCH", body: JSON.stringify(values) });
      toast.success("Profile updated");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't save your changes — please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="space-y-4">
          <h2 className="font-medium">Profile</h2>
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourstudio.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-medium">Social links</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="socialLinks.twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter / X</FormLabel>
                  <FormControl>
                    <Input placeholder="https://x.com/…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLinks.instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLinks.behance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Behance</FormLabel>
                  <FormControl>
                    <Input placeholder="https://behance.net/…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLinks.dribbble"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dribbble</FormLabel>
                  <FormControl>
                    <Input placeholder="https://dribbble.com/…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className="font-medium">Payout method</h2>
          <p className="text-sm text-muted-foreground">
            Payouts are processed manually by the Glyphora team in V1 — tell us how you&apos;d like to be paid.
          </p>
          <FormField
            control={form.control}
            name="payoutMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. PayPal, bank transfer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="payoutDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g. PayPal email, or bank account details" rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
