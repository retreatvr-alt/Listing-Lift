"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Home, Camera, Lightbulb, Phone, Mail, MapPin, User, FileText, Smartphone } from "lucide-react";
import { PhotoUploader } from "@/components/ui/photo-uploader";

import { StepIndicator } from "@/components/ui/step-indicator";
import { ROOM_CATEGORIES, ROOM_TIPS, ROOM_PHOTO_LIMITS } from "@/lib/enhancement-prompts";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  subCategory?: string;
  orientation: 'landscape' | 'portrait';
  isUploading?: boolean;
  cloud_storage_path?: string;
}

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  city: string;
  provinceState: string;
  postalZip: string;
  notes: string;
}

const STEPS = [
  'Your Information',
  'Photography Tips',
  'Kitchen',
  'Bedroom',
  'Living Spaces',
  'Bathroom',
  'Pool/Hot Tub',
  'Exterior',
  'Review & Submit'
];

export function SubmissionForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    email: '',
    phone: '',
    propertyAddress: '',
    city: '',
    provinceState: '',
    postalZip: '',
    notes: ''
  });
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, PhotoFile[]>>({
    Kitchen: [],
    Bedroom: [],
    'Living Spaces': [],
    Bathroom: [],
    'Pool/Hot Tub': [],
    Exterior: []
  });

  const totalPhotos = Object.values(photosByRoom).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  // Scroll to top when navigating between steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const updatePhotosForRoom = useCallback((room: string, photos: PhotoFile[]) => {
    setPhotosByRoom(prev => {
      const updated = { ...(prev ?? {}) };
      updated[room] = [...photos]; // Create new array reference
      return updated;
    });
  }, []);

  // Helper to detect content type, especially for HEIC files
  const getContentType = (file: File): string => {
    // If file.type is set, non-empty, and not a generic fallback, use it
    if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
      return file.type;
    }
    // Fallback based on file extension
    const ext = file.name?.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  };

  const uploadPhotos = async (): Promise<{ roomCategory: string; subCategory?: string; caption: string; originalUrl: string; orientation: string }[]> => {
    const uploadedPhotos: { roomCategory: string; subCategory?: string; caption: string; originalUrl: string; orientation: string }[] = [];

    for (const [room, photos] of Object.entries(photosByRoom ?? {})) {
      for (const photo of (photos ?? [])) {
        if (!photo?.file) continue;
        
        const contentType = getContentType(photo.file);
        
        // Get presigned URL
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: photo.file.name,
            contentType: contentType,
            isPublic: true
          })
        });

        if (!presignedRes.ok) {
          console.error('Failed to get presigned URL:', await presignedRes.text());
          throw new Error('Failed to get upload URL');
        }

        const { uploadUrl, cloud_storage_path } = await presignedRes.json();

        if (!uploadUrl || !cloud_storage_path) {
          console.error('Invalid presigned URL response');
          throw new Error('Invalid upload URL');
        }

        // Upload to S3 - just need Content-Type header
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: photo.file,
          headers: {
            'Content-Type': contentType
          }
        });

        if (!uploadRes.ok) {
          console.error('Failed to upload to S3:', uploadRes.status, await uploadRes.text());
          throw new Error('Failed to upload photo');
        }

        uploadedPhotos.push({
          roomCategory: room,
          subCategory: photo.subCategory,
          caption: photo.caption,
          originalUrl: cloud_storage_path,
          orientation: photo.orientation
        });
      }
    }

    return uploadedPhotos;
  };

  const handleSubmit = async () => {
    if (totalPhotos === 0) {
      alert('Please upload at least one photo');
      return;
    }

    // Check all captions
    for (const photos of Object.values(photosByRoom ?? {})) {
      for (const photo of (photos ?? [])) {
        if (!photo?.caption?.trim?.()) {
          alert('Please add a caption to all photos');
          return;
        }
      }
    }

    // Check subcategory selections for rooms that require them
    const roomsWithSubs = ROOM_CATEGORIES.filter(r => r.hasSubcategories);
    for (const room of roomsWithSubs) {
      const roomPhotos = photosByRoom?.[room.id] ?? [];
      for (const photo of roomPhotos) {
        if (!photo?.subCategory) {
          alert(`Please select a room type for all ${room.name} photos.\n\nOne or more photos are missing a room type selection.`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // Upload all photos
      const uploadedPhotos = await uploadPhotos();

      // Create submission
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeownerName: contactInfo.name,
          email: contactInfo.email,
          phone: contactInfo.phone,
          propertyAddress: contactInfo.propertyAddress,
          city: contactInfo.city,
          provinceState: contactInfo.provinceState,
          postalZip: contactInfo.postalZip,
          notes: contactInfo.notes,
          photos: uploadedPhotos
        })
      });

      const data = await res.json();

      if (data?.success) {
        router.push(`/submit/confirmation?id=${data.submission?.submissionNumber}`);
      } else {
        throw new Error(data?.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return contactInfo?.name && contactInfo?.email && contactInfo?.phone && contactInfo?.propertyAddress;
    }
    return true;
  };

  const getRoomCategory = () => {
    const roomIndex = currentStep - 2;
    return ROOM_CATEGORIES[roomIndex] || null;
  };

  const getMaxPhotosForRoom = (cat: typeof ROOM_CATEGORIES[0]) => {
    if (cat.hasSubcategories && cat.subcategories) {
      return cat.subcategories.reduce(
        (sum, sub) => sum + (ROOM_PHOTO_LIMITS[sub] || 10), 0
      );
    }
    return ROOM_PHOTO_LIMITS[cat.id] || 10;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f7f4] to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#eae7e1]">
              <Image
                src="/listing-lift-logo.png"
                alt="Listing Lift"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-semibold text-[#383D31] hidden sm:inline">Listing Lift</span>
          </div>
          <div className="flex-1 max-w-xs mx-4">
            <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} />
          </div>
          <div className="text-sm text-gray-500">
            {totalPhotos} photos
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 0: Contact Info */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#383D31]">Your Information</h1>
                  <p className="text-gray-600 mt-2">Tell us about yourself and your property</p>
                </div>

                <div className="bg-[#f9f7f4] border border-[#e2dfda] rounded-xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#383D31] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#383D31]">You don&apos;t need your photos ready yet!</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      After filling in your details, we&apos;ll guide you room by room with tips on how to take the best photos from your phone.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={contactInfo?.name || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), name: e.target.value } as ContactInfo))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                        placeholder="Your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={contactInfo?.email || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), email: e.target.value } as ContactInfo))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={contactInfo?.phone || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), phone: e.target.value } as ContactInfo))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={contactInfo?.propertyAddress || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), propertyAddress: e.target.value } as ContactInfo))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={contactInfo?.city || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), city: e.target.value } as ContactInfo))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Province/State</label>
                      <input
                        type="text"
                        value={contactInfo?.provinceState || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), provinceState: e.target.value } as ContactInfo))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal/ZIP</label>
                      <input
                        type="text"
                        value={contactInfo?.postalZip || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), postalZip: e.target.value } as ContactInfo))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={contactInfo?.notes || ''}
                        onChange={(e) => setContactInfo(prev => ({ ...(prev ?? {}), notes: e.target.value } as ContactInfo))}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                        rows={3}
                        placeholder="Any special requests or information about your property"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Photography Tips */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#383D31]">Quick Tips for Great Photos</h1>
                  <p className="text-gray-600 mt-2">Before you start shooting, review these essential tips</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-lg">What AI CAN Fix</h3>
                    </div>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Dark photos → brightened</li>
                      <li>• Tilted framing → straightened</li>
                      <li>• Overcast skies → blue sky</li>
                      <li>• Blown-out windows → recovered</li>
                      <li>• Wrinkly beds → smoothed</li>
                      <li>• Photographer reflections → removed</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="font-semibold text-lg">What AI CANNOT Fix</h3>
                    </div>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Blurry/motion blur photos</li>
                      <li>• Extremely dark photos (no details)</li>
                      <li>• Bad composition/wrong angle</li>
                      <li>• Complex clutter (remove physically)</li>
                      <li>• Severe grain/noise</li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-lg">The 5-Photo Rule</h3>
                    </div>
                    <p className="text-gray-600 mb-3">Your first 5 listing photos should be a diverse highlight reel:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-600">
                      <li>Hero shot (best amenity or exterior)</li>
                      <li>Living Room (comfort & spaciousness)</li>
                      <li>Master Bedroom (luxury linens)</li>
                      <li>Kitchen (ready-to-cook appeal)</li>
                      <li>Key Amenity (pool, bathroom, etc.)</li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Home className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-lg">Lighting Tips</h3>
                    </div>
                    <ul className="space-y-2 text-gray-600">
                      <li>• Open ALL blinds and curtains</li>
                      <li>• Best time for interiors: 10 AM - 3 PM</li>
                      <li>• Avoid using only ceiling lights</li>
                      <li>• Place floor lamps behind camera</li>
                      <li>• Exteriors: golden hour is best</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Steps 2-7: Room uploads */}
            {currentStep >= 2 && currentStep <= 7 && (() => {
              const roomCategory = getRoomCategory();
              if (!roomCategory) return null;
              const tips = ROOM_TIPS[roomCategory.id] || ROOM_TIPS['Kitchen'];
              
              return (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#383D31]">{roomCategory.name} Photos</h1>
                    <p className="text-gray-600 mt-2">
                      Upload up to {getMaxPhotosForRoom(roomCategory)} {roomCategory.name.toLowerCase()} photos
                      {!roomCategory.hasSubcategories && " (4-8 recommended)"}
                      {roomCategory.hasSubcategories && " across all room types"}
                    </p>
                  </div>

                  {/* Tips */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-500" />
                      Quick Tips for {roomCategory.name} Photos
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {(tips?.tips ?? []).map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-600">
                          <span className="text-[#383D31]">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Subcategory info box for rooms with subcategories */}
                  {roomCategory.hasSubcategories && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">📋 This section includes multiple room types:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {roomCategory.subcategories?.map((sub) => (
                          <li key={sub}>• <strong>{sub}</strong></li>
                        ))}
                      </ul>
                      <p className="text-sm text-blue-600 mt-2">
                        After uploading each photo, use the dropdown to select which type of space it shows.
                      </p>
                    </div>
                  )}

                  {/* Photo uploader */}
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-semibold text-lg mb-4">Upload Your {roomCategory.name} Photos</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Add a quick 1-2 word label for each photo to help us organize your listing.
                      {roomCategory.hasSubcategories && (
                        <span className="text-blue-600 font-medium"> Don&apos;t forget to select the room type from the dropdown!</span>
                      )}
                    </p>
                    <PhotoUploader
                      roomCategory={roomCategory.id}
                      subcategories={roomCategory.hasSubcategories ? roomCategory.subcategories : undefined}
                      photos={photosByRoom?.[roomCategory.id] ?? []}
                      onPhotosChange={(photos) => updatePhotosForRoom(roomCategory.id, photos)}
                      maxPhotos={getMaxPhotosForRoom(roomCategory)}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Step 8: Review & Submit */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[#383D31]">Review & Submit</h1>
                  <p className="text-gray-600 mt-2">Review your information and photos before submitting</p>
                </div>

                {/* Contact Info Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Name:</span> {contactInfo?.name}</div>
                    <div><span className="text-gray-500">Email:</span> {contactInfo?.email}</div>
                    <div><span className="text-gray-500">Phone:</span> {contactInfo?.phone}</div>
                    <div><span className="text-gray-500">Address:</span> {[contactInfo?.propertyAddress, contactInfo?.city, contactInfo?.provinceState, contactInfo?.postalZip].filter(Boolean).join(', ')}</div>
                  </div>
                  {contactInfo?.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-gray-500 text-sm">Notes:</span>
                      <p className="text-sm mt-1">{contactInfo.notes}</p>
                    </div>
                  )}
                </div>

                {/* Photos Summary */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-semibold text-lg mb-4">Photos Summary ({totalPhotos} total)</h3>
                  <div className="space-y-4">
                    {ROOM_CATEGORIES.map((room) => {
                      const photos = photosByRoom?.[room.id] ?? [];
                      if (photos.length === 0) return null;
                      return (
                        <div key={room.id}>
                          <h4 className="font-medium text-gray-700 mb-2">{room.name} ({photos.length})</h4>
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {photos.map((photo) => (
                              <div key={photo?.id} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                                {photo?.preview && (
                                  <img
                                    src={photo.preview}
                                    alt={photo?.caption || 'Photo'}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                  {photo?.caption || 'No caption'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {totalPhotos === 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
                    ⚠️ You haven&apos;t uploaded any photos yet. Please go back and add photos to submit.
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-[#383D31] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(STEPS.length - 1, prev + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {currentStep === 1 ? 'Begin Uploading Photos' : `Next: ${STEPS[currentStep + 1]}`}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || totalPhotos === 0}
              className="flex items-center gap-2 px-8 py-3 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Photos
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
