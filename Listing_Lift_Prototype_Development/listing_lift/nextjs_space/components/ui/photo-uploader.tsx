"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, AlertTriangle, FileImage, Loader2 } from "lucide-react";
import { PhotoCaptionWizard } from "./photo-caption-wizard";

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
  maxPhotos = 10
}: PhotoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [convertingCount, setConvertingCount] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardPhotos, setWizardPhotos] = useState<PhotoFile[]>([]);

  // Convert HEIC to JPEG using heic-to library (uses libheif 1.21.2 with H.265 support)
  const convertHeicToJpeg = async (file: File): Promise<{ blob: Blob; preview: string; success: boolean }> => {
    try {
      console.log('[HEIC] Converting:', file.name, 'size:', file.size);
      const { heicTo } = await import('heic-to');
      const outputBlob = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.9
      });
      
      console.log('[HEIC] Conversion successful, output size:', outputBlob.size);
      const preview = URL.createObjectURL(outputBlob);
      return { blob: outputBlob, preview, success: true };
    } catch (error) {
      console.error('[HEIC] Conversion failed:', error);
      return { blob: file, preview: '', success: false };
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
      if (photos.length + filesToProcess.length >= maxPhotos) {
        const remainingSlots = maxPhotos - photos.length;
        alert(
          `You can only upload ${remainingSlots} more photo(s) for this room.\n\n` +
          `Maximum is ${maxPhotos} photos per room. ${files.length - i} file(s) were not added.`
        );
        break;
      }
      filesToProcess.push(file);
    }

    // Count HEIC files for loading indicator
    const heicCount = filesToProcess.filter(isHeicFile).length;
    if (heicCount > 0) {
      setConvertingCount(heicCount);
    }

    const newPhotos: PhotoFile[] = [];
    const failedHeicFiles: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      let preview: string;
      let fileToUse: File;
      let orientation: 'landscape' | 'portrait';

      if (isHeicFile(file)) {
        const converted = await convertHeicToJpeg(file);
        setConvertingCount(prev => Math.max(0, prev - 1));
        
        if (converted.success) {
          // Use converted JPEG for both preview AND upload
          preview = converted.preview;
          fileToUse = new File(
            [converted.blob],
            file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
          orientation = await checkOrientation(converted.blob);
        } else {
          // Conversion failed - skip this file and track for user notification
          failedHeicFiles.push(file.name);
          continue;
        }
      } else {
        preview = URL.createObjectURL(file);
        fileToUse = file;
        orientation = await checkOrientation(file);
      }

      newPhotos.push({
        id: `${Date.now()}-${i}`,
        file: fileToUse,
        preview,
        caption: '',
        subCategory: undefined,
        orientation,
        fileName: file.name
      });
    }

    setConvertingCount(0);

    if (newPhotos.length > 0) {
      // Show caption wizard for newly uploaded photos
      setWizardPhotos(newPhotos);
      setShowWizard(true);
    }

    // Show user-friendly error for failed HEIC files
    if (failedHeicFiles.length > 0) {
      alert(
        `${failedHeicFiles.length} HEIC file(s) could not be converted:\n${failedHeicFiles.join(', ')}\n\n` +
        `Tip: On your iPhone, go to Settings → Camera → Formats → "Most Compatible" to save photos as JPEG instead. ` +
        `Or use a free online converter like heictojpg.com before uploading.`
      );
    }
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

  const handleWizardComplete = (captionedPhotos: PhotoFile[]) => {
    // Add captioned photos to existing photos
    onPhotosChange([...photos, ...captionedPhotos]);
    setShowWizard(false);
    setWizardPhotos([]);
  };

  const handleWizardCancel = () => {
    // Discard uncaptioned photos
    setShowWizard(false);
    setWizardPhotos([]);
  };

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
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-semibold text-[#383D31]">
                Upload up to {maxPhotos} photos for this room
              </p>
              <p className="text-xs text-gray-500 mt-1">
                We recommend 4-8 photos per room
              </p>
            </div>
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
                    value={photo?.subCategory || ''}
                    onChange={(e) => updatePhoto(photo?.id || '', { subCategory: e.target.value || undefined })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mt-2"
                  >
                    <option value="">— Select —</option>
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
      <div className="text-sm text-center space-y-1">
        <p className="font-semibold text-gray-700">
          {photos.length} of {maxPhotos} photos uploaded
        </p>
        {photos.length > 0 && photos.length < 4 && (
          <p className="text-amber-600 text-xs">
            We recommend at least 4 photos for this room
          </p>
        )}
        {photos.length >= maxPhotos && (
          <p className="text-red-600 text-xs font-medium">
            Room photo limit reached
          </p>
        )}
      </div>

      {/* Caption Wizard Modal */}
      {showWizard && wizardPhotos.length > 0 && (
        <PhotoCaptionWizard
          photos={wizardPhotos}
          subcategories={subcategories}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
          roomCategory={roomCategory}
        />
      )}
    </div>
  );
}
