import UploadWorkspace from "@/components/upload/UploadWorkspace";
export default function UploadPage() {
  return (
    <div className="min-h-screen bg-[#020617] p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Evidence Upload</h1>
        <p className="mt-2 text-sm text-slate-400">
          Upload media files for OCR extraction, QR analysis, wallet detection,
          risk scoring and entity correlation.
        </p>
      </div>
      <UploadWorkspace />
    </div>
  );
}
