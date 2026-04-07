import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit — terminus.ink",
  description: "Submit a new experiment post",
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 font-serif text-2xl text-text">
        Submit an experiment
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Each post follows a fixed structure. Fill in the fields below.
      </p>

      <form className="space-y-6">
        {/* Title */}
        <Field label="Title" placeholder="EXP-055: Byte-Level Statistical Analysis" />

        {/* Question */}
        <Field
          label="Question"
          placeholder="One sentence. What are you testing?"
        />

        {/* Setup */}
        <Field
          label="Setup"
          placeholder="Dataset, hardware, config. Brief."
          textarea
        />

        {/* Results */}
        <Field
          label="Results"
          placeholder="Paste a markdown table with your raw numbers."
          textarea
        />

        {/* Key findings */}
        <Field
          label="Key findings"
          placeholder="3–5 bullet points. What did you learn? (one per line)"
          textarea
        />

        {/* Tags */}
        <Field
          label="Tags"
          placeholder="#ssm #byte-level #information-theory"
        />

        {/* Optional: Lesson learned */}
        <Field
          label="Lesson learned (optional)"
          placeholder="What would you do differently?"
        />

        {/* Optional: Tools used */}
        <Field
          label="Tools used (optional)"
          placeholder="Declare AI assistance, hardware, frameworks"
        />

        {/* Chain */}
        <Field
          label="Links to prior experiments (optional)"
          placeholder="terminus.ink/e/2026-04-05-exp054"
        />

        <div className="pt-2">
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-gold/40 bg-gold-glow py-2.5 font-mono text-sm text-gold opacity-60"
          >
            Coming soon — GitHub OAuth required
          </button>
          <p className="mt-2 text-center text-xs text-text-muted">
            Submission will require GitHub authentication. Posts are permanent —
            no edits after 48 hours.
          </p>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  placeholder,
  textarea,
}: {
  label: string;
  placeholder: string;
  textarea?: boolean;
}) {
  const base =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-muted transition-colors focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20";
  return (
    <div>
      <label className="mb-1.5 block font-mono text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </label>
      {textarea ? (
        <textarea className={`${base} min-h-24 resize-y`} placeholder={placeholder} />
      ) : (
        <input className={base} placeholder={placeholder} />
      )}
    </div>
  );
}
