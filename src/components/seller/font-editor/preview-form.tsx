"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { PREVIEW_TEXT_PRESETS } from "@/lib/fonts";
import { fontPreviewSchema, type FontPreviewInput } from "@/types/schemas/font.schema";
import type { WizardFile } from "./types";

export function PreviewForm({
  fontId,
  files,
  initial,
  onSaved,
  submitLabel = "Continue",
}: {
  fontId: string;
  files: WizardFile[];
  initial: FontPreviewInput;
  onSaved: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const form = useForm<FontPreviewInput>({ resolver: zodResolver(fontPreviewSchema), defaultValues: initial });
  const previewFiles = files.filter((f) => f.purpose === "PREVIEW");

  async function onSubmit(values: FontPreviewInput) {
    try {
      await apiFetch(`/api/seller/fonts/${fontId}`, { method: "PATCH", body: JSON.stringify(values) });
      await onSaved();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't save — please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="previewText"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preview text</FormLabel>
              <FormControl>
                <Input placeholder="Type something" {...field} />
              </FormControl>
              <FormDescription>Shown by default on your font&apos;s card and detail page.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap gap-2">
          {PREVIEW_TEXT_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue("previewText", preset, { shouldValidate: true })}
            >
              {preset}
            </Button>
          ))}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Preview files</p>
          {previewFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No preview file uploaded yet — go back to the Files step to add one.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {previewFiles.map((f, i) => (
                <li key={f.id}>
                  {f.originalFilename} ({f.format}){" "}
                  {i === 0 && <span className="text-foreground">— used for the live preview</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
