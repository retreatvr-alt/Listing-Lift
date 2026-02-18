# Listing Lift - Code Export for Debugging

## Issues to Debug:
1. **HEIC photo previews don't work** - JPEG, PNG, WebP work fine during upload, but HEIC files show broken previews
2. **Admin dashboard photos are broken** - When clicking on photos in admin, they show as broken files (see screenshot). This suggests photos may not be uploading to S3 correctly.

---

## File: components/ui/photo-uploader.tsx
```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, AlertTriangle, FileImage, Loader2 } from "lucide-react";

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  caption: string;
  subCategory?: string;
  orientation: 'landscape' | 'portrait';
  isUploading?: boolean;
  cloud_storage_path?: string;
  fileName?: string;
  isConverting?: boolean;
}

interface PhotoUploaderProps {
  roomCategory: string;
  subcategories?: string[];
  photos: PhotoFile[];
  onPhotosChange: (photos: PhotoFile[]) => void;
  maxPhotos?: number;
}

export function PhotoUploader({
  roomCategory,
  subcategories,
  photos,
  onPhotosChange,
  maxPhotos = 60
}: PhotoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [convertingCount, setConvertingCount] = useState(0);

  // Convert HEIC to JPEG using heic2any library
  const convertHeicToJpeg = async (file: File): Promise<{ blob: Blob; preview: string }> => {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      });
      
      // heic2any can return array or single blob
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const preview = URL.createObjectURL(blob);
      return { blob, preview };
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      // Return original file as fallback
      return { blob: file, preview: URL.createObjectURL(file) };
    }
  };

  const checkOrientation = (blobOrFile: Blob | File): Promise<'landscape' | 'portrait'> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      const url = URL.createObjectURL(blobOrFile);
      img.onload = () => {
        resolve(img.width >= img.height ? 'landscape' : 'portrait');
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('landscape');
      };
      img.src = url;
    });
  };

  const isHeicFile = (file: File): boolean => {
    const fileExt = file.name?.split('.').pop()?.toLowerCase();
    const mimeType = file?.type?.toLowerCase() || '';
    return mimeType.includes('heic') || mimeType.includes('heif') || 
           fileExt === 'heic' || fileExt === 'heif';
  };

  const handleFiles = useCallback(async (files: FileList) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const filesToProcess: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name?.split('.').pop()?.toLowerCase();
      const isValidType = validTypes.includes(file?.type?.toLowerCase() || '') || 
                          fileExt === 'heic' || fileExt === 'heif';
      if (!isValidType) continue;
      if (photos.length + filesToProcess.length >= maxPhotos) break;
      filesToProcess.push(file);
    }

    // Count HEIC files for loading indicator
    const heicCount = filesToProcess.filter(isHeicFile).length;
    if (heicCount > 0) {
      setConvertingCount(heicCount);
    }

    const newPhotos: PhotoFile[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      let preview: string;
      let orientation: 'landscape' | 'portrait';

      if (isHeicFile(file)) {
        // Convert HEIC to JPEG for preview
        const converted = await convertHeicToJpeg(file);
        preview = converted.preview;
        orientation = await checkOrientation(converted.blob);
        setConvertingCount(prev => Math.max(0, prev - 1));
      } else {
        preview = URL.createObjectURL(file);
        orientation = await checkOrientation(file);
      }

      newPhotos.push({
        id: `${Date.now()}-${i}`,
        file, // Keep original file for upload
        preview,
        caption: '',
        subCategory: subcategories?.[0] || undefined,
        orientation,
        fileName: file.name
      });
    }

    setConvertingCount(0);
    onPhotosChange([...photos, ...newPhotos]);
  }, [photos, onPhotosChange, maxPhotos, subcategories]);

  // Handle preview errors
  const handlePreviewError = useCallback((photoId: string) => {
    setPreviewErrors(prev => ({ ...prev, [photoId]: true }));
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target?.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removePhoto = useCallback((id: string) => {
    const photo = photos.find(p => p?.id === id);
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    onPhotosChange(photos.filter(p => p?.id !== id));
  }, [photos, onPhotosChange]);

  const updatePhoto = useCallback((id: string, updates: Partial<PhotoFile>) => {
    onPhotosChange(photos.map(p => p?.id === id ? { ...p, ...updates } : p));
  }, [photos, onPhotosChange]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-[#383D31] bg-[#383D31]/5' : 'border-gray-300 hover:border-[#383D31]/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={handleInputChange}
        />
        {convertingCount > 0 ? (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-[#383D31] mb-4 animate-spin" />
            <p className="text-lg font-medium text-gray-700">Converting HEIC files...</p>
            <p className="text-sm text-gray-500 mt-1">{convertingCount} file(s) remaining</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700">Drag & drop photos here</p>
            <p className="text-sm text-gray-500 mt-1">or tap to select</p>
            <p className="text-xs text-gray-400 mt-2">Supported: HEIC, JPEG, PNG, WebP</p>
            <p className="text-xs text-gray-400">Recommended: 4-8 photos per room</p>
          </>
        )}
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo?.id} className="relative group bg-white rounded-lg shadow-md overflow-hidden">
              {/* Image preview */}
              <div className="relative aspect-[4/3] bg-gray-100">
                {photo?.preview && !previewErrors[photo.id] ? (
                  /* Using native img tag for blob URLs - Next.js Image doesn't handle them well */
                  <img
                    src={photo.preview}
                    alt={photo?.caption || 'Photo preview'}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={() => handlePreviewError(photo.id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-2">
                    <FileImage className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-xs text-gray-500 text-center break-all line-clamp-2">
                      {photo?.fileName || 'Preview unavailable'}
                    </span>
                  </div>
                )}
                
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(photo?.id || '');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Portrait warning */}
                {photo?.orientation === 'portrait' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-xs p-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>Portrait - Landscape preferred</span>
                  </div>
                )}
              </div>

              {/* File name display */}
              <div className="px-3 pt-2 pb-1 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate" title={photo?.fileName}>
                  📁 {photo?.fileName || 'Unknown file'}
                </p>
              </div>

              {/* Caption input */}
              <div className="p-3 pt-2">
                <input
                  type="text"
                  placeholder="Caption (required)"
                  value={photo?.caption || ''}
                  onChange={(e) => updatePhoto(photo?.id || '', { caption: e.target.value })}
                  className={`w-full text-sm border rounded px-2 py-1.5 ${
                    !photo?.caption ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  maxLength={50}
                />
                <p className="text-xs text-gray-400 mt-1">e.g., "Kitchen 1", "Master Bath"</p>

                {/* Subcategory select */}
                {subcategories && subcategories.length > 0 && (
                  <select
                    value={photo?.subCategory || subcategories[0]}
                    onChange={(e) => updatePhoto(photo?.id || '', { subCategory: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mt-2"
                  >
                    {subcategories.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo count */}
      <div className="text-sm text-gray-500 text-center">
        {photos.length} / {maxPhotos} photos uploaded
      </div>
    </div>
  );
}
```

---

## File: components/submission/submission-form.tsx
```tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Home, Camera, Lightbulb, Phone, Mail, MapPin, User, FileText } from "lucide-react";
import { PhotoUploader } from "@/components/ui/photo-uploader";

import { StepIndicator } from "@/components/ui/step-indicator";
import { ROOM_CATEGORIES, ROOM_TIPS } from "@/lib/enhancement-prompts";

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

  const updatePhotosForRoom = useCallback((room: string, photos: PhotoFile[]) => {
    setPhotosByRoom(prev => ({ ...(prev ?? {}), [room]: photos }));
  }, []);

  // Helper to detect content type, especially for HEIC files
  const getContentType = (file: File): string => {
    if (file.type && file.type !== '') {
      return file.type;
    }
    // Fallback for HEIC files where browser doesn't set type
    const ext = file.name?.split('.').pop()?.toLowerCase();
    if (ext === 'heic') return 'image/heic';
    if (ext === 'heif') return 'image/heif';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'application/octet-stream';
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

        // Check if Content-Disposition is in signed headers
        const hasContentDisposition = uploadUrl?.includes?.('content-disposition');

        // Upload to S3
        const uploadHeaders: Record<string, string> = {
          'Content-Type': contentType
        };
        if (hasContentDisposition) {
          uploadHeaders['Content-Disposition'] = 'attachment';
        }

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: photo.file,
          headers: uploadHeaders
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f7f4] to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
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
                    <p className="text-gray-600 mt-2">Upload 4-8 {roomCategory.name.toLowerCase()} photos (recommended)</p>
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
                      maxPhotos={60 - totalPhotos + (photosByRoom?.[roomCategory.id]?.length ?? 0)}
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
```

---

## File: lib/s3.ts
```ts
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

const s3Client = createS3Client();
const { bucketName, folderPrefix } = getBucketConfig();

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

export async function initiateMultipartUpload(
  fileName: string,
  isPublic: boolean = false
): Promise<{ uploadId: string; cloud_storage_path: string }> {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const response = await s3Client.send(command);

  return {
    uploadId: response.UploadId ?? "",
    cloud_storage_path,
  };
}

export async function getPresignedUrlForPart(
  cloud_storage_path: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  cloud_storage_path: string,
  uploadId: string,
  parts: { ETag: string; PartNumber: number }[]
): Promise<void> {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
}

export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
): Promise<string> {
  if (isPublic) {
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}
```

---

## File: lib/aws-config.ts
```ts
import { S3Client } from "@aws-sdk/client-s3";

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME ?? "",
    folderPrefix: process.env.AWS_FOLDER_PREFIX ?? ""
  };
}

export function createS3Client() {
  return new S3Client({});
}
```

---

## File: app/api/upload/presigned/route.ts
```ts
import { NextResponse } from "next/server";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { fileName, contentType, isPublic = true } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path
    });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
```

---

## File: app/api/file-url/route.ts
```ts
import { NextResponse } from "next/server";
import { getFileUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    const url = await getFileUrl(path, true);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Get file URL error:", error);
    return NextResponse.json({ error: "Failed to get URL" }, { status: 500 });
  }
}
```

---

## File: app/api/submissions/route.ts
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { sendNotificationEmail, generateSubmissionConfirmationEmail, generateAdminAlertEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Generate submission number like 2026-0205-001
function generateSubmissionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${year}-${month}${day}-${random}`;
}

// GET - List submissions (admin only)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const email = searchParams.get('email');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (email) where.email = email;

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        photos: {
          select: {
            id: true,
            roomCategory: true,
            status: true,
            isHero: true
          }
        },
        _count: {
          select: { photos: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Get submissions error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST - Create new submission (public)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { homeownerName, email, phone, propertyAddress, city, provinceState, postalZip, notes, photos } = data;

    if (!homeownerName || !email || !phone || !propertyAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 }
      );
    }

    if (photos.length > 60) {
      return NextResponse.json(
        { error: "Maximum 60 photos allowed per submission" },
        { status: 400 }
      );
    }

    const submissionNumber = generateSubmissionNumber();

    const submission = await prisma.submission.create({
      data: {
        submissionNumber,
        homeownerName,
        email,
        phone,
        propertyAddress,
        city: city || null,
        provinceState: provinceState || null,
        postalZip: postalZip || null,
        notes: notes || null,
        status: "New",
        photos: {
          create: photos.map((photo: { roomCategory: string; subCategory?: string; caption: string; originalUrl: string; orientation: string }, index: number) => ({
            roomCategory: photo.roomCategory,
            subCategory: photo.subCategory || null,
            caption: photo.caption,
            originalUrl: photo.originalUrl,
            orientation: photo.orientation || 'landscape',
            status: 'Pending',
            sortOrder: index
          }))
        }
      },
      include: {
        photos: true
      }
    });

    // Send confirmation email to homeowner
    const fullAddress = [propertyAddress, city, provinceState, postalZip].filter(Boolean).join(', ');
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_SUBMISSION_CONFIRMATION || '',
      recipientEmail: email,
      subject: `Submission Received - #${submissionNumber}`,
      body: generateSubmissionConfirmationEmail({
        name: homeownerName,
        submissionNumber,
        propertyAddress: fullAddress,
        photoCount: photos.length
      })
    });

    // Send alert to admin
    await sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_NEW_SUBMISSION_ALERT || '',
      recipientEmail: 'dan@retreatvr.ca',
      subject: `New Submission - #${submissionNumber} from ${homeownerName}`,
      body: generateAdminAlertEmail({
        submissionNumber,
        homeownerName,
        email,
        propertyAddress: fullAddress,
        photoCount: photos.length
      })
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        submissionNumber: submission.submissionNumber
      }
    });
  } catch (error) {
    console.error("Create submission error:", error);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
}
```

---

## File: app/admin/submissions/[id]/page.tsx
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Loader2, ArrowLeft, User, Mail, Phone, MapPin, FileText, 
  Camera, CheckCircle, XCircle, RotateCcw, Star, Download, 
  ChevronLeft, ChevronRight, Sliders, Send, Archive
} from "lucide-react";

interface Photo {
  id: string;
  roomCategory: string;
  subCategory?: string;
  caption: string;
  originalUrl: string;
  enhancedUrl?: string;
  heroUrl?: string;
  status: string;
  isHero: boolean;
  orientation: string;
  rejectionReason?: string;
  reuploadInstructions?: string;
  enhancementVersions: Array<{
    id: string;
    versionNumber: number;
    enhancedUrl: string;
    intensity: string;
    createdAt: string;
  }>;
}

interface Submission {
  id: string;
  submissionNumber: string;
  homeownerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  city?: string;
  provinceState?: string;
  postalZip?: string;
  notes?: string;
  status: string;
  createdAt: string;
  photos: Photo[];
}

function SubmissionDetailContent() {
  const router = useRouter();
  const params = useParams();
  const submissionId = params?.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceSettings, setEnhanceSettings] = useState({
    intensity: 'Moderate',
    skyReplacement: false,
    bedFixing: false,
    windowRecovery: false,
    brightness: false,
    perspective: false,
    reflection: false,
    additionalNotes: ''
  });
  const [actionNotes, setActionNotes] = useState('');
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const session = await res.json();
      if (!session?.user) {
        router.replace('/admin/login');
        return false;
      }
      return true;
    } catch {
      router.replace('/admin/login');
      return false;
    }
  }, [router]);

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      const data = await res.json();
      if (data?.submission) {
        setSubmission(data.submission);
        if (!selectedPhoto && data.submission?.photos?.length > 0) {
          setSelectedPhoto(data.submission.photos[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch submission:', error);
    } finally {
      setLoading(false);
    }
  }, [submissionId, selectedPhoto]);

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkSession();
      setIsAuthenticated(authenticated);
      if (authenticated && submissionId) {
        fetchSubmission();
      }
    };
    init();
  }, [checkSession, submissionId, fetchSubmission]);

  const getS3Url = async (path: string): Promise<string> => {
    if (!path) return '';
    // If already a full URL, return it
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    // Otherwise get presigned URL
    try {
      const res = await fetch(`/api/file-url?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      return data?.url || '';
    } catch {
      return '';
    }
  };

  const handleEnhance = async () => {
    if (!selectedPhoto) return;
    setEnhancing(true);

    try {
      const response = await fetch(`/api/photos/${selectedPhoto.id}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhanceSettings)
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data?.status === 'completed' && data?.enhancedUrl) {
                // Refresh submission to get updated photo
                await fetchSubmission();
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      alert('Enhancement failed. Please try again.');
    } finally {
      setEnhancing(false);
    }
  };

  const handlePhotoAction = async (action: 'approve' | 'reject' | 'reupload') => {
    if (!selectedPhoto) return;

    try {
      let updateData: Record<string, unknown> = {};
      
      switch (action) {
        case 'approve':
          updateData = { status: 'Approved' };
          break;
        case 'reject':
          updateData = { status: 'Rejected', rejectionReason: actionNotes };
          break;
        case 'reupload':
          updateData = { status: 'Re-upload Requested', reuploadInstructions: actionNotes };
          break;
      }

      await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      setActionNotes('');
      await fetchSubmission();
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const handleSetHero = async () => {
    if (!selectedPhoto) return;

    try {
      await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHero: true })
      });

      await fetchSubmission();
    } catch (error) {
      console.error('Set hero failed:', error);
    }
  };

  const handleSendMagicLink = async () => {
    if (!submission) return;
    setSendingMagicLink(true);

    try {
      const reuploadPhotos = submission.photos.filter(p => p?.status === 'Re-upload Requested');
      if (reuploadPhotos.length === 0) {
        alert('No photos marked for re-upload');
        return;
      }

      await fetch('/api/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: submission.id,
          instructions: actionNotes
        })
      });

      alert('Magic link sent to homeowner!');
      setActionNotes('');
    } catch (error) {
      console.error('Send magic link failed:', error);
      alert('Failed to send magic link');
    } finally {
      setSendingMagicLink(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!submission) return;

    try {
      await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      await fetchSubmission();
    } catch (error) {
      console.error('Update status failed:', error);
    }
  };

  const groupedPhotos = (submission?.photos ?? []).reduce((acc, photo) => {
    const key = photo?.roomCategory ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  const currentPhotoIndex = submission?.photos?.findIndex?.(p => p?.id === selectedPhoto?.id) ?? 0;
  const prevPhoto = submission?.photos?.[currentPhotoIndex - 1];
  const nextPhoto = submission?.photos?.[currentPhotoIndex + 1];

  if (isAuthenticated === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f7f4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#383D31]" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f7f4]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Submission Not Found</h1>
          <Link href="/admin" className="text-[#383D31] hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-[#383D31]">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="font-bold text-[#383D31]">
                #{submission.submissionNumber}
              </h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                submission.status === 'New' ? 'bg-blue-100 text-blue-800' :
                submission.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                submission.status === 'Completed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {submission.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={submission.status}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left sidebar - Contact info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-[#383D31] mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Contact Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  {submission.homeownerName}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
                    {submission.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {submission.phone}
                </div>
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-[#383D31] mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Property
              </h3>
              <p className="text-sm text-gray-700">
                {[submission.propertyAddress, submission.city, submission.provinceState, submission.postalZip]
                  .filter(Boolean).join(', ')}
              </p>
              {submission.notes && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <FileText className="w-3 h-3" /> Notes
                  </div>
                  <p className="text-sm text-gray-700">{submission.notes}</p>
                </div>
              )}
            </div>

            {/* Room navigation */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-[#383D31] mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Photos by Room
              </h3>
              <div className="space-y-3">
                {Object.entries(groupedPhotos).map(([room, photos]) => (
                  <div key={room}>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      {room} ({photos?.length ?? 0})
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(photos ?? []).map((photo) => (
                        <button
                          key={photo?.id}
                          onClick={() => setSelectedPhoto(photo)}
                          className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                            selectedPhoto?.id === photo?.id
                              ? 'border-[#383D31] ring-2 ring-[#383D31]/20'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <div className="relative w-full h-full bg-gray-100">
                            {photo?.originalUrl && (
                              <img
                                src={photo.enhancedUrl || photo.originalUrl}
                                alt={photo?.caption || 'Photo'}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          {photo?.isHero && (
                            <div className="absolute top-0 right-0 bg-amber-500 text-white p-0.5 rounded-bl">
                              <Star className="w-3 h-3" />
                            </div>
                          )}
                          {photo?.status === 'Approved' && (
                            <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 text-white text-xs py-0.5 text-center">
                              ✓
                            </div>
                          )}
                          {photo?.status === 'Rejected' && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 text-white text-xs py-0.5 text-center">
                              ✗
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch actions */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="font-semibold text-[#383D31] mb-3">Batch Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={handleSendMagicLink}
                  disabled={sendingMagicLink}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {sendingMagicLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Re-upload Link
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24]">
                  <Download className="w-4 h-4" />
                  Download All (ZIP)
                </button>
              </div>
            </div>
          </div>

          {/* Main content - Photo viewer */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPhoto ? (
              <>
                {/* Photo comparison */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-[#383D31]">{selectedPhoto.caption}</h3>
                      <p className="text-sm text-gray-500">
                        {selectedPhoto.roomCategory}
                        {selectedPhoto.subCategory ? ` • ${selectedPhoto.subCategory}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => prevPhoto && setSelectedPhoto(prevPhoto)}
                        disabled={!prevPhoto}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm text-gray-500">
                        {currentPhotoIndex + 1} / {submission.photos?.length ?? 0}
                      </span>
                      <button
                        onClick={() => nextPhoto && setSelectedPhoto(nextPhoto)}
                        disabled={!nextPhoto}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Side by side comparison */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-2 text-center">ORIGINAL</div>
                      <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                        {selectedPhoto.originalUrl && (
                          <img
                            src={selectedPhoto.originalUrl.startsWith('http') ? selectedPhoto.originalUrl : `/api/file-url?path=${encodeURIComponent(selectedPhoto.originalUrl)}`}
                            alt="Original"
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2 text-center">ENHANCED</div>
                      <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                        {selectedPhoto.enhancedUrl ? (
                          <img
                            src={selectedPhoto.enhancedUrl}
                            alt="Enhanced"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                            <span>Not yet enhanced</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={handleSetHero}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm ${
                        selectedPhoto.isHero
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      {selectedPhoto.isHero ? 'Hero Photo' : 'Set as Hero'}
                    </button>
                  </div>
                </div>

                {/* Enhancement controls */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h3 className="font-semibold text-[#383D31] mb-4 flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Enhancement Settings
                  </h3>

                  <div className="space-y-4">
                    {/* Intensity */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Intensity</label>
                      <div className="flex gap-2">
                        {['Light', 'Moderate', 'Significant'].map((level) => (
                          <button
                            key={level}
                            onClick={() => setEnhanceSettings(prev => ({ ...prev, intensity: level }))}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              enhanceSettings.intensity === level
                                ? 'bg-[#383D31] text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { key: 'skyReplacement', label: 'Sky Replacement' },
                        { key: 'windowRecovery', label: 'Window Recovery' },
                        { key: 'brightness', label: 'Brightness Boost' },
                        { key: 'bedFixing', label: 'Bed Fixing' },
                        { key: 'perspective', label: 'Perspective Fix' },
                        { key: 'reflection', label: 'Reflection Removal' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={enhanceSettings[key as keyof typeof enhanceSettings] as boolean}
                            onChange={(e) => setEnhanceSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="rounded text-[#383D31]"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Additional notes */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Additional Notes</label>
                      <textarea
                        value={enhanceSettings.additionalNotes}
                        onChange={(e) => setEnhanceSettings(prev => ({ ...prev, additionalNotes: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Any specific instructions for this photo..."
                      />
                    </div>

                    {/* Enhance button */}
                    <button
                      onClick={handleEnhance}
                      disabled={enhancing}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24] disabled:opacity-50"
                    >
                      {enhancing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-5 h-5" />
                          {selectedPhoto.enhancedUrl ? 'Re-run Enhancement' : 'Run Enhancement'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Photo actions */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h3 className="font-semibold text-[#383D31] mb-4">Photo Actions</h3>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Notes (for rejection or re-upload request)
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      rows={2}
                      placeholder="Explain why this photo is being rejected or needs re-upload..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePhotoAction('approve')}
                      disabled={selectedPhoto.status === 'Approved'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handlePhotoAction('reject')}
                      disabled={selectedPhoto.status === 'Rejected' || !actionNotes}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handlePhotoAction('reupload')}
                      disabled={!actionNotes}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Re-upload
                    </button>
                  </div>

                  {/* Current status */}
                  <div className="mt-4 pt-4 border-t">
                    <span className="text-sm text-gray-500">Current status: </span>
                    <span className={`text-sm font-medium ${
                      selectedPhoto.status === 'Approved' ? 'text-green-600' :
                      selectedPhoto.status === 'Rejected' ? 'text-red-600' :
                      selectedPhoto.status === 'Re-upload Requested' ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>
                      {selectedPhoto.status}
                    </span>
                    {selectedPhoto.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {selectedPhoto.rejectionReason}</p>
                    )}
                    {selectedPhoto.reuploadInstructions && (
                      <p className="text-sm text-amber-600 mt-1">Instructions: {selectedPhoto.reuploadInstructions}</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
                Select a photo to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubmissionDetailPage() {
  return <SubmissionDetailContent />;
}
```

---

## File: prisma/schema.prisma
```prisma
generator client {
    provider = "prisma-client-js"
    binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]
    output = "/home/ubuntu/listing_lift/nextjs_space/node_modules/.prisma/client"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model AdminUser {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Submission {
  id                    String    @id @default(cuid())
  submissionNumber      String    @unique
  homeownerName         String
  email                 String
  phone                 String
  propertyAddress       String
  city                  String?
  provinceState         String?
  postalZip             String?
  notes                 String?
  status                String    @default("New") // New, In Progress, Completed, Scheduled for Deletion
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  completedAt           DateTime?
  deletionScheduledAt   DateTime?
  photos                Photo[]
  magicLinks            MagicLink[]
}

model Photo {
  id                  String    @id @default(cuid())
  submissionId        String
  submission          Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  roomCategory        String    // Kitchen, Bedroom, Living Spaces, Bathroom, Pool/Hot Tub, Exterior
  subCategory         String?   // Living Room, Dining Room/Dining Area, Building Exterior, Lawn/Backyard, Miscellaneous
  caption             String    // Required 1-2 word label
  originalUrl         String    // S3 cloud_storage_path
  enhancedUrl         String?   // S3 cloud_storage_path
  heroUrl             String?   // S3 cloud_storage_path for hero version
  status              String    @default("Pending") // Pending, Enhanced, Approved, Rejected, Re-upload Requested
  isHero              Boolean   @default(false)
  orientation         String    @default("landscape") // landscape, portrait
  rejectionReason     String?
  reuploadInstructions String?
  sortOrder           Int       @default(0)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  enhancementVersions EnhancementVersion[]
}

model EnhancementVersion {
  id              String   @id @default(cuid())
  photoId         String
  photo           Photo    @relation(fields: [photoId], references: [id], onDelete: Cascade)
  versionNumber   Int
  enhancedUrl     String   // S3 cloud_storage_path
  intensity       String   @default("Moderate") // Light, Moderate, Significant
  skyReplacement  Boolean  @default(false)
  bedFixing       Boolean  @default(false)
  windowRecovery  Boolean  @default(false)
  brightness      Boolean  @default(false)
  perspective     Boolean  @default(false)
  reflection      Boolean  @default(false)
  additionalNotes String?
  createdAt       DateTime @default(now())
}

model MagicLink {
  id           String    @id @default(cuid())
  token        String    @unique
  submissionId String
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  expiresAt    DateTime
  usedAt       DateTime?
  createdAt    DateTime  @default(now())
}
```
