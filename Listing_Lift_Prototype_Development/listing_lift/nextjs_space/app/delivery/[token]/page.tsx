"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Download, Star, X, Loader2, AlertCircle, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";

interface Photo {
  id: string;
  roomCategory: string;
  subCategory?: string;
  caption: string;
  isHero: boolean;
  orientation: string;
  originalUrl?: string;
  enhancedUrl?: string;
  heroUrl?: string;
}

interface SubmissionInfo {
  id: string;
  homeownerName: string;
  propertyAddress: string;
  submissionNumber: string;
}

export default function DeliveryPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [heroPhotos, setHeroPhotos] = useState<Photo[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<"none" | "approved" | "changes" | "submitted">("none");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/delivery?token=${token}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setError(data.error || "Invalid or expired link");
          return;
        }

        setSubmission(data.submission);
        setPhotos(data.photos);
        setHeroPhotos(data.heroPhotos);
      } catch {
        setError("Failed to load. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (token) loadData();
  }, [token]);

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackStatus === "none") return;
    
    setSubmittingFeedback(true);
    try {
      const res = await fetch("/api/delivery/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          status: feedbackStatus === "approved" ? "Approved" : "Changes Requested",
          notes: feedbackNotes || undefined,
        }),
      });

      if (res.ok) {
        setFeedbackStatus("submitted");
      }
    } catch {
      alert("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#383D31] mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading your photos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9f7f4] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#383D31] mb-2">Oops!</h1>
          <p className="text-gray-600 text-lg mb-6">{error}</p>
          <p className="text-gray-500">If you need help, contact dan@retreatvr.ca</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4] pb-32">
      {/* Header */}
      <div className="bg-[#383D31] py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-[#f9f7f4] mb-2">Listing Lift</h1>
          <p className="text-[#d4d1c8] mb-4">by Retreat Vacation Rentals</p>
          <h2 className="text-2xl text-white font-semibold">Your Enhanced Photos</h2>
        </div>
      </div>

      {/* Property info */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-gray-500 text-sm">Submission #{submission?.submissionNumber}</p>
          <p className="text-lg font-semibold text-[#383D31]">{submission?.propertyAddress}</p>
          <p className="text-gray-600">{photos.length} enhanced photos</p>
        </div>
      </div>

      {/* Hero Photos Section */}
      {heroPhotos.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <h3 className="text-xl font-bold text-[#383D31] mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            Your Cover Photo{heroPhotos.length > 1 ? "s" : ""}
          </h3>
          <div className="space-y-6">
            {heroPhotos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Before/After comparison */}
                <div className="grid md:grid-cols-2">
                  {/* Before */}
                  <div className="relative">
                    <div className="absolute top-4 left-4 bg-gray-800/70 text-white px-3 py-1 rounded-lg text-lg font-bold z-10">
                      BEFORE
                    </div>
                    <div className="relative aspect-[3/2] bg-gray-100">
                      {photo.originalUrl && (
                        <Image
                          src={photo.originalUrl}
                          alt="Before"
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </div>
                  {/* After */}
                  <div className="relative">
                    <div className="absolute top-4 left-4 bg-green-600/90 text-white px-3 py-1 rounded-lg text-lg font-bold z-10">
                      AFTER
                    </div>
                    <div className="relative aspect-[3/2] bg-gray-100">
                      {(photo.heroUrl || photo.enhancedUrl) && (
                        <Image
                          src={photo.heroUrl || photo.enhancedUrl || ""}
                          alt="After"
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
                {/* Info and download */}
                <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#383D31]">
                      {photo.subCategory || photo.roomCategory} — {photo.caption}
                    </p>
                    <p className="text-sm text-amber-600">4000×2667 — Optimized for Airbnb cover</p>
                  </div>
                  <button
                    onClick={() => handleDownload(photo.heroUrl || photo.enhancedUrl || "", `hero-${photo.caption}.jpg`)}
                    className="flex items-center gap-2 bg-[#383D31] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2a2e24] transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Cover Photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Photos Grid */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <h3 className="text-xl font-bold text-[#383D31] mb-4">
          Your Enhanced Photos ({photos.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setLightboxPhoto(photo)}
              className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            >
              <div className="relative aspect-[3/2] bg-gray-100">
                {photo.enhancedUrl && (
                  <Image
                    src={photo.enhancedUrl}
                    alt={photo.caption}
                    fill
                    className="object-cover"
                  />
                )}
                {photo.isHero && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white rounded-full p-1">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-[#383D31] text-sm truncate">
                  {photo.subCategory || photo.roomCategory}
                </p>
                <p className="text-xs text-gray-500 truncate">{photo.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-[#383D31] mb-4">Happy with your photos?</h3>
          
          {feedbackStatus === "submitted" ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-xl text-[#383D31] font-semibold">Thank you for your feedback!</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setFeedbackStatus("approved")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-medium transition-colors ${
                    feedbackStatus === "approved"
                      ? "bg-green-600 text-white"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  <ThumbsUp className="w-6 h-6" />
                  Love them!
                </button>
                <button
                  onClick={() => setFeedbackStatus("changes")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-medium transition-colors ${
                    feedbackStatus === "changes"
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsDown className="w-6 h-6" />
                  Need changes
                </button>
              </div>

              {feedbackStatus === "changes" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What would you like changed?
                  </label>
                  <textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="Please describe what you'd like us to adjust..."
                    className="w-full p-3 border rounded-lg min-h-[100px] focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                  />
                </div>
              )}

              {feedbackStatus !== "none" && (
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={submittingFeedback}
                  className="w-full bg-[#383D31] text-white py-3 rounded-lg font-medium hover:bg-[#2a2e24] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingFeedback ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sticky Download All button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <a
            href={`/api/delivery/download?token=${token}`}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-4 rounded-xl text-xl font-semibold hover:bg-green-700 transition-colors"
          >
            <Download className="w-6 h-6" />
            Download All Photos
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-lg"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="w-full max-w-6xl">
            {/* Side by side on desktop, stacked on mobile */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Before */}
              <div>
                <div className="bg-gray-800/50 text-white px-4 py-2 rounded-t-lg text-center text-xl font-bold">
                  BEFORE
                </div>
                <div className="relative aspect-[3/2] bg-gray-900 rounded-b-lg overflow-hidden">
                  {lightboxPhoto.originalUrl && (
                    <Image
                      src={lightboxPhoto.originalUrl}
                      alt="Before"
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
              </div>
              {/* After */}
              <div>
                <div className="bg-green-600 text-white px-4 py-2 rounded-t-lg text-center text-xl font-bold">
                  AFTER
                </div>
                <div className="relative aspect-[3/2] bg-gray-900 rounded-b-lg overflow-hidden">
                  {lightboxPhoto.enhancedUrl && (
                    <Image
                      src={lightboxPhoto.enhancedUrl}
                      alt="After"
                      fill
                      className="object-contain"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Info and download */}
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-medium mb-4">
                {lightboxPhoto.subCategory || lightboxPhoto.roomCategory} — {lightboxPhoto.caption}
              </p>
              <button
                onClick={() => handleDownload(lightboxPhoto.enhancedUrl || "", `${lightboxPhoto.caption}.jpg`)}
                className="inline-flex items-center gap-2 bg-white text-[#383D31] px-8 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download This Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
