"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Upload } from "lucide-react";

interface RetakePhoto {
  id: string;
  roomCategory: string;
  subCategory?: string;
  caption: string;
  reuploadInstructions?: string;
  originalUrl?: string;
  status: string;
}

interface SubmissionInfo {
  id: string;
  homeownerName: string;
  propertyAddress: string;
  submissionNumber: string;
}

type WizardStep = "loading" | "welcome" | "upload" | "summary" | "done" | "error";

export default function RetakesWizardPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [step, setStep] = useState<WizardStep>("loading");
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [retakePhotos, setRetakePhotos] = useState<RetakePhoto[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validate token and load data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/retakes?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setErrorMsg(data.error || "Invalid or expired link");
          setStep("error");
          return;
        }

        setSubmission(data.submission);
        setRetakePhotos(data.retakePhotos);
        setStep("welcome");
      } catch {
        setErrorMsg("Failed to load. Please try again.");
        setStep("error");
      }
    }

    if (token) loadData();
  }, [token]);

  const currentPhoto = retakePhotos[currentPhotoIndex];
  const totalPhotos = retakePhotos.length;
  const uploadedCount = uploadedPhotos.size;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPhoto) return;

    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      // Get presigned URL
      const presignRes = await fetch("/api/retakes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          photoId: currentPhoto.id,
          fileName: file.name,
          contentType: file.type || "image/jpeg",
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData.error);

      // Upload to S3
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      // Save to DB
      const saveRes = await fetch("/api/retakes/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          photoId: currentPhoto.id,
          cloud_storage_path: presignData.cloud_storage_path,
          action: "save_photo",
        }),
      });

      if (!saveRes.ok) throw new Error("Failed to save");

      setUploadedPhotos(prev => new Set([...prev, currentPhoto.id]));
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed. Please try again.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  }, [token, currentPhoto]);

  const handleNext = () => {
    setPreviewUrl(null);
    if (currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else {
      setStep("summary");
    }
  };

  const handlePrevious = () => {
    setPreviewUrl(null);
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setPreviewUrl(null);
    handleNext();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/retakes/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: "submit" }),
      });

      if (!res.ok) throw new Error("Submit failed");

      setStep("done");
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#383D31] mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === "error") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#383D31] mb-2">Oops!</h1>
          <p className="text-gray-600 text-lg mb-6">{errorMsg}</p>
          <p className="text-gray-500">If you need help, contact dan@retreatvr.ca</p>
        </div>
      </div>
    );
  }

  // Welcome step
  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex flex-col">
        {/* Header */}
        <div className="bg-[#383D31] py-6 px-4 text-center">
          <h1 className="text-2xl font-bold text-[#f9f7f4]">Listing Lift</h1>
          <p className="text-[#d4d1c8] text-sm">by Retreat Vacation Rentals</p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold text-[#383D31] mb-4">
              Hi {submission?.homeownerName?.split(" ")[0]}!
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              We need <span className="font-bold text-amber-600">{totalPhotos} more photo{totalPhotos > 1 ? "s" : ""}</span> for your listing at {submission?.propertyAddress}.
            </p>

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Progress</span>
                <span>{uploadedCount} of {totalPhotos} uploaded</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(uploadedCount / totalPhotos) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={() => setStep("upload")}
              className="w-full bg-[#383D31] text-white py-4 px-8 rounded-xl text-xl font-semibold hover:bg-[#2a2e24] transition-colors"
            >
              Let's Get Started
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Upload step
  if (step === "upload" && currentPhoto) {
    const isUploaded = uploadedPhotos.has(currentPhoto.id);

    return (
      <div className="min-h-screen bg-[#f9f7f4] flex flex-col">
        {/* Header with progress */}
        <div className="bg-[#383D31] py-4 px-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <h1 className="text-lg font-bold text-[#f9f7f4]">Listing Lift</h1>
            <span className="text-[#d4d1c8] text-sm">
              Photo {currentPhotoIndex + 1} of {totalPhotos}
            </span>
          </div>
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-3">
            {retakePhotos.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i === currentPhotoIndex
                    ? "bg-white"
                    : uploadedPhotos.has(retakePhotos[i].id)
                    ? "bg-green-400"
                    : "bg-gray-500"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pb-32">
          <div className="max-w-lg mx-auto">
            {/* Room info */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#383D31]">
                {currentPhoto.subCategory || currentPhoto.roomCategory}
              </h2>
              <p className="text-lg text-gray-600">{currentPhoto.caption}</p>
            </div>

            {/* Instructions */}
            {currentPhoto.reuploadInstructions && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
                <p className="text-amber-800">{currentPhoto.reuploadInstructions}</p>
              </div>
            )}

            {/* Original photo thumbnail */}
            {currentPhoto.originalUrl && (
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Original photo:</p>
                <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={currentPhoto.originalUrl}
                    alt="Original"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Upload area */}
            {!isUploaded && !previewUrl ? (
              <label className="block w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  {uploading ? (
                    <Loader2 className="w-12 h-12 animate-spin text-[#383D31]" />
                  ) : (
                    <>
                      <Camera className="w-16 h-16 text-gray-400" />
                      <span className="text-lg text-gray-600 font-medium">Tap to Take Photo</span>
                      <span className="text-sm text-gray-400">or choose from library</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-4">
                {previewUrl && (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-4">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                )}
                {isUploaded && (
                  <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                    <CheckCircle className="w-8 h-8" />
                    <span className="text-xl font-semibold">Photo Uploaded!</span>
                  </div>
                )}
                {!uploading && !isUploaded && (
                  <label className="block w-full text-center py-3 text-[#383D31] font-medium cursor-pointer hover:underline">
                    Try a different photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentPhotoIndex === 0}
              className="flex items-center gap-1 px-4 py-3 text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            {!isUploaded && (
              <button
                onClick={handleSkip}
                className="text-gray-500 text-sm hover:underline"
              >
                Skip for Now
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-3 bg-[#383D31] text-white rounded-xl font-medium"
            >
              <span>{currentPhotoIndex === totalPhotos - 1 ? "Review" : "Next"}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Summary step
  if (step === "summary") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex flex-col">
        {/* Header */}
        <div className="bg-[#383D31] py-6 px-4 text-center">
          <h1 className="text-2xl font-bold text-[#f9f7f4]">Review Your Photos</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pb-32">
          <div className="max-w-lg mx-auto">
            {/* Grid of photos */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {retakePhotos.map((photo) => {
                const isUploaded = uploadedPhotos.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    className={`bg-white rounded-xl p-3 shadow ${
                      isUploaded ? "border-2 border-green-500" : "border-2 border-amber-300"
                    }`}
                  >
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                      {photo.originalUrl && (
                        <Image
                          src={photo.originalUrl}
                          alt={photo.caption}
                          fill
                          className="object-cover"
                        />
                      )}
                      <div className={`absolute top-2 right-2 ${
                        isUploaded ? "bg-green-500" : "bg-amber-500"
                      } text-white rounded-full p-1`}>
                        {isUploaded ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[#383D31] truncate">
                      {photo.subCategory || photo.roomCategory}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{photo.caption}</p>
                  </div>
                );
              })}
            </div>

            {/* Status message */}
            {uploadedCount === 0 ? (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
                <p className="text-amber-800">No photos uploaded yet. You can come back later to add them.</p>
              </div>
            ) : uploadedCount < totalPhotos ? (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
                <p className="text-amber-800">
                  {uploadedCount} of {totalPhotos} photos uploaded. You can submit now and come back for the rest.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
                <p className="text-green-800 font-medium">
                  ✅ All {totalPhotos} photos uploaded and ready to submit!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-lg mx-auto space-y-3">
            {uploadedCount > 0 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-green-600 text-white py-4 px-8 rounded-xl text-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Submit {uploadedCount} Photo{uploadedCount > 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => {
                setCurrentPhotoIndex(0);
                setPreviewUrl(null);
                setStep("upload");
              }}
              className="w-full text-gray-600 py-3 text-lg hover:underline"
            >
              ← Go Back to Photos
            </button>
            <p className="text-center text-gray-500 text-sm">
              You can close this page and come back anytime within 30 days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Done step
  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex flex-col">
        {/* Header */}
        <div className="bg-[#383D31] py-6 px-4 text-center">
          <h1 className="text-2xl font-bold text-[#f9f7f4]">Listing Lift</h1>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-[#383D31] mb-4">All Done!</h2>
            {uploadedCount === totalPhotos ? (
              <p className="text-lg text-gray-600 mb-6">
                We received all {uploadedCount} photos. We'll email you when your enhanced photos are ready!
              </p>
            ) : (
              <p className="text-lg text-gray-600 mb-6">
                We received {uploadedCount} photo{uploadedCount > 1 ? "s" : ""}. 
                {totalPhotos - uploadedCount > 0 && (
                  <> You can come back using the same link to upload the remaining {totalPhotos - uploadedCount}.</>  
                )}
              </p>
            )}
            <p className="text-gray-500">
              Questions? Contact dan@retreatvr.ca
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
