"use client";

type Props = {
  disabled: boolean;
  onFileChange: (file: File | null) => void;
  file: File | null;
  onProcess: () => void;
  isProcessing: boolean;
};

export function FileUploader({
  disabled,
  onFileChange,
  file,
  onProcess,
  isProcessing
}: Props) {
  return (
    <section className="panel uploader-panel">
      <div className="panel-header">
        <h2>Floor Plan Input</h2>
        <p>Upload clean digital plans (PNG/JPG/WebP). Plan B is primary evaluation input.</p>
      </div>

      <div className="uploader-row">
        <label className={`upload-drop ${disabled ? "disabled" : ""}`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          />
          <span>{file ? file.name : "Drop or select floor plan image"}</span>
        </label>

        <button
          type="button"
          disabled={disabled || !file || isProcessing}
          onClick={onProcess}
        >
          {isProcessing ? "Processing..." : "Run End-to-End Pipeline"}
        </button>
      </div>
    </section>
  );
}
