"use client";

import { useMemo, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, CaseLower, CaseSensitive, CaseUpper } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { buildFontFaceCss } from "@/lib/fonts";
import { cn } from "@/lib/utils";

type TextCase = "none" | "upper" | "lower";
type Align = "left" | "center" | "right";

export function FontPreviewHero({
  fontId,
  previewFontUrl,
  defaultPreviewText,
}: {
  fontId: string;
  previewFontUrl: string | null;
  defaultPreviewText: string;
}) {
  const [text, setText] = useState(defaultPreviewText);
  const [fontSize, setFontSize] = useState(72);
  const [weight, setWeight] = useState(400);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.1);
  const [align, setAlign] = useState<Align>("left");
  const [textCase, setTextCase] = useState<TextCase>("none");

  const { fontFamily, css } = useMemo(() => buildFontFaceCss(fontId, previewFontUrl), [fontId, previewFontUrl]);

  const displayText = textCase === "upper" ? text.toUpperCase() : textCase === "lower" ? text.toLowerCase() : text;

  return (
    <section className="border-b border-border/80">
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="min-h-48 overflow-hidden border-b border-border/70 px-6 py-10 sm:px-10">
            <p
              className="break-words"
              style={{
                fontFamily: previewFontUrl ? fontFamily : undefined,
                fontSize: `${fontSize}px`,
                fontWeight: weight,
                letterSpacing: `${letterSpacing}em`,
                lineHeight,
                textAlign: align,
              }}
            >
              {displayText || "Type something…"}
            </p>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your own text to preview…"
              rows={2}
              aria-label="Custom preview text"
              className="resize-none"
            />

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
              <Control label={`Size — ${fontSize}px`}>
                <Slider min={16} max={160} step={2} value={[fontSize]} onValueChange={([v]) => setFontSize(v)} />
              </Control>
              <Control label={`Weight — ${weight}`}>
                <Slider min={100} max={900} step={100} value={[weight]} onValueChange={([v]) => setWeight(v)} />
              </Control>
              <Control label={`Letter spacing — ${letterSpacing.toFixed(2)}em`}>
                <Slider
                  min={-0.05}
                  max={0.3}
                  step={0.01}
                  value={[letterSpacing]}
                  onValueChange={([v]) => setLetterSpacing(v)}
                />
              </Control>
              <Control label={`Line height — ${lineHeight.toFixed(1)}`}>
                <Slider min={0.8} max={2} step={0.1} value={[lineHeight]} onValueChange={([v]) => setLineHeight(v)} />
              </Control>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-border/70 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Align</span>
                <SegmentedGroup
                  value={align}
                  onChange={(v) => setAlign(v as Align)}
                  options={[
                    { value: "left", label: "Align left", icon: AlignLeft },
                    { value: "center", label: "Align center", icon: AlignCenter },
                    { value: "right", label: "Align right", icon: AlignRight },
                  ]}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Case</span>
                <SegmentedGroup
                  value={textCase}
                  onChange={(v) => setTextCase(v as TextCase)}
                  options={[
                    { value: "none", label: "Original case", icon: CaseSensitive },
                    { value: "upper", label: "Uppercase", icon: CaseUpper },
                    { value: "lower", label: "Lowercase", icon: CaseLower },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SegmentedGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {options.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          aria-label={label}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
            value === v ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}
