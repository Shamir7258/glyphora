"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiFetch, ClientApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { fontDetailsSchema, type FontDetailsInput } from "@/types/schemas/font.schema";
import type { CategoryDTO, TagDTO } from "@/types/dto";

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Latin",
  "Cyrillic",
  "Greek",
  "Vietnamese",
  "Chinese",
  "Japanese",
];

export function DetailsForm({
  fontId,
  categories,
  tags,
  initial,
  onSaved,
  submitLabel = "Continue",
}: {
  fontId: string;
  categories: CategoryDTO[];
  tags: TagDTO[];
  initial: FontDetailsInput;
  onSaved: () => void | Promise<void>;
  submitLabel?: string;
}) {
  const form = useForm<FontDetailsInput>({ resolver: zodResolver(fontDetailsSchema), defaultValues: initial });

  async function onSubmit(values: FontDetailsInput) {
    try {
      await apiFetch(`/api/seller/fonts/${fontId}`, { method: "PATCH", body: JSON.stringify(values) });
      await onSaved();
    } catch (err) {
      if (err instanceof ClientApiError) toast.error(err.message);
      else toast.error("Couldn't save — please try again.");
    }
  }

  const selectedTags = useWatch({ control: form.control, name: "tagIds" }) ?? [];
  const selectedLanguages = useWatch({ control: form.control, name: "languages" }) ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Font name</FormLabel>
              <FormControl>
                <Input placeholder="Grotesk Futura" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell customers what makes this typeface great…" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tagIds"
          render={() => (
            <FormItem>
              <FormLabel>Tags (up to 10)</FormLabel>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const checked = selectedTags.includes(tag.id);
                  return (
                    <Label
                      key={tag.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                        checked ? "border-primary bg-accent" : "border-input"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v
                            ? [...selectedTags, tag.id].slice(0, 10)
                            : selectedTags.filter((id) => id !== tag.id);
                          form.setValue("tagIds", next, { shouldValidate: true });
                        }}
                      />
                      {tag.name}
                    </Label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="languages"
          render={() => (
            <FormItem>
              <FormLabel>Supported languages</FormLabel>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const checked = selectedLanguages.includes(lang);
                  return (
                    <Label
                      key={lang}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                        checked ? "border-primary bg-accent" : "border-input"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = v ? [...selectedLanguages, lang] : selectedLanguages.filter((l) => l !== lang);
                          form.setValue("languages", next, { shouldValidate: true });
                        }}
                      />
                      {lang}
                    </Label>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="glyphCount"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Glyph count</FormLabel>
              <FormControl>
                <Input type="number" min={1} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
