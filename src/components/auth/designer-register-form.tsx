"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { becomeDesignerSchema, type BecomeDesignerInput } from "@/types/schemas/auth.schema";

export function DesignerRegisterForm({ defaultDisplayName }: { defaultDisplayName: string }) {
  const router = useRouter();
  const { update } = useSession();

  const form = useForm<BecomeDesignerInput>({
    resolver: zodResolver(becomeDesignerSchema),
    defaultValues: { username: "", displayName: defaultDisplayName, bio: "", website: "" },
  });

  async function onSubmit(values: BecomeDesignerInput) {
    try {
      await apiFetch("/api/designers/register", { method: "POST", body: JSON.stringify(values) });
      toast.success("You're a designer now — welcome aboard.");
      // Refresh the JWT session so roles/designerProfileId reflect the new
      // DesignerProfile immediately, without forcing a re-login (see
      // src/server/lib/auth.ts's jwt() callback, trigger: "update" branch).
      await update();
      router.push("/seller/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.fieldErrors) {
          for (const [field, messages] of Object.entries(err.fieldErrors)) {
            if (field in form.getValues()) {
              form.setError(field as keyof BecomeDesignerInput, { message: messages[0] });
            }
          }
        }
        toast.error(err.message);
      } else {
        toast.error("Something went wrong — please try again.");
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="jane-type" autoComplete="off" {...field} />
              </FormControl>
              <FormDescription>Your storefront URL: glyphora.app/designers/{field.value || "username"}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
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
                <Textarea placeholder="Tell customers about your type design practice…" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Website <span className="text-muted-foreground">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="https://yourstudio.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Setting up your profile…" : "Create designer profile"}
        </Button>
      </form>
    </Form>
  );
}
