"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, CheckCircle, AlertTriangle, X } from "lucide-react";

interface Photo {
  id: string;
  roomCategory: string;
  caption: string;
  reuploadInstructions?: string;
}

interface Submission {
  submissionNumber: string;
  homeownerName: string;
  propertyAddress: string;
  photos: Photo[];
}

export default function ReuploadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [uploads, setUploads] = useState<Record<string, { file: File; preview: string; cloud_storage_path?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const res = await fetch(`/api/magic-link?token=${token}`);
      const data = await res.json();

      if (!data?.valid) {
        setError(data?.error || 'Invalid or expired link');
      } else {
        setSubmission(data.submission);
      }
    } catch {
      setError('Failed to validate link');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (photoId: string, file: File) => {
    setUploads(prev => ({
      ...prev,
      [photoId]: {
        file,
        preview: URL.createObjectURL(file)
      }
    }));
  };

  const removeUpload = (photoId: string) => {
    setUploads(prev => {
      const copy = { ...prev };
      if (copy[photoId]?.preview) {
        URL.revokeObjectURL(copy[photoId].preview);
      }
      delete copy[photoId];
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!submission) return;

    const photoIds = Object.keys(uploads);
    if (photoIds.length === 0) {
      alert('Please upload at least one photo');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload each file
      const uploadedPhotos: { id: string; originalUrl: string }[] = [];

      for (const photoId of photoIds) {
        const { file } = uploads[photoId];
        if (!file) continue;

        // Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            isPublic: true
          })
        });

        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        // Check if Content-Disposition is in signed headers
        const hasContentDisposition = uploadUrl?.includes?.('content-disposition');
        const uploadHeaders: Record<string, string> = {
          'Content-Type': file.type
        };
        if (hasContentDisposition) {
          uploadHeaders['Content-Disposition'] = 'attachment';
        }

        // Upload to S3
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: uploadHeaders
        });

        uploadedPhotos.push({
          id: photoId,
          originalUrl: cloud_storage_path
        });
      }

      // Complete reupload
      const res = await fetch('/api/magic-link/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          photos: uploadedPhotos
        })
      });

      const data = await res.json();

      if (data?.success) {
        alert('Photos uploaded successfully!');
        router.push('/');
      } else {
        throw new Error(data?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f7f4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#383D31]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f7f4] px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">{error}</h1>
          <p className="text-gray-600">Please contact support if you need assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src="/listing-lift-logo.png"
              alt="Listing Lift"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="font-semibold text-[#383D31]">Re-upload Photos</h1>
            <p className="text-xs text-gray-500">#{submission?.submissionNumber}</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[#383D31] mb-2">
            Welcome back, {submission?.homeownerName}!
          </h2>
          <p className="text-gray-600">
            Please re-upload the following photos for your property at {submission?.propertyAddress}.
          </p>
        </div>

        <div className="space-y-4">
          {(submission?.photos ?? []).map((photo) => (
            <div key={photo?.id} className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#383D31]">{photo?.caption}</h3>
                  <p className="text-sm text-gray-500">{photo?.roomCategory}</p>
                </div>
                {photo?.reuploadInstructions && (
                  <div className="bg-amber-50 text-amber-800 text-sm px-3 py-2 rounded-lg max-w-xs">
                    <strong>Instructions:</strong> {photo.reuploadInstructions}
                  </div>
                )}
              </div>

              {uploads[photo?.id ?? ''] ? (
                <div className="relative">
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={uploads[photo?.id ?? '']?.preview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => removeUpload(photo?.id ?? '')}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-[#383D31]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target?.files?.[0];
                      if (file) handleFileChange(photo?.id ?? '', file);
                    }}
                  />
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600">Click to upload replacement photo</p>
                  <p className="text-sm text-gray-400 mt-1">HEIC, JPEG, PNG, WebP</p>
                </label>
              )}
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(uploads).length === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#383D31] text-white rounded-lg text-lg font-semibold hover:bg-[#2a2e24] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Submit Re-uploads ({Object.keys(uploads).length} photos)
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
