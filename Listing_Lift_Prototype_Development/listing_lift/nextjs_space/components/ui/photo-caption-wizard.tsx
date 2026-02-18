"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, Trash2, AlertTriangle } from "lucide-react";

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

interface PhotoCaptionWizardProps {
  photos: PhotoFile[];
  subcategories?: string[];
  onComplete: (captionedPhotos: PhotoFile[]) => void;
  onCancel: () => void;
  roomCategory: string;
}

export function PhotoCaptionWizard({
  photos,
  subcategories,
  onComplete,
  onCancel,
  roomCategory
}: PhotoCaptionWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localPhotos, setLocalPhotos] = useState<PhotoFile[]>([...photos]);
  const [caption, setCaption] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const captionInputRef = useRef<HTMLInputElement>(null);

  const currentPhoto = localPhotos[currentIndex];
  const isLastPhoto = currentIndex === localPhotos.length - 1;
  const canProceed = caption.trim().length > 0 &&
    (!subcategories || subcategories.length === 0 || subCategory !== '');

  // Auto-focus caption input when photo changes
  useEffect(() => {
    setTimeout(() => captionInputRef.current?.focus(), 100);
  }, [currentIndex]);

  // Initialize caption/subcategory when index changes
  useEffect(() => {
    if (localPhotos[currentIndex]) {
      setCaption(localPhotos[currentIndex].caption || '');
      setSubCategory(localPhotos[currentIndex].subCategory || '');
    }
  }, [currentIndex, localPhotos]);

  const handleNext = () => {
    // Save caption to current photo
    const updated = [...localPhotos];
    updated[currentIndex] = {
      ...updated[currentIndex],
      caption: caption.trim(),
      subCategory: subCategory || undefined
    };
    setLocalPhotos(updated);

    if (isLastPhoto) {
      onComplete(updated);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canProceed) {
      handleNext();
    }
  };

  const handleDelete = () => {
    const updated = localPhotos.filter((_, i) => i !== currentIndex);

    if (updated.length === 0) {
      onComplete([]);
      return;
    }

    const newIndex = currentIndex >= updated.length ? updated.length - 1 : currentIndex;
    setLocalPhotos(updated);
    setCurrentIndex(newIndex);
    setCaption(updated[newIndex]?.caption || '');
    setSubCategory(updated[newIndex]?.subCategory || subcategories?.[0] || '');
  };

  if (!currentPhoto) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#383D31] text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold">Add Photo Captions</h2>
            <p className="text-sm text-gray-300 mt-0.5">
              Photo {currentIndex + 1} of {localPhotos.length} — {roomCategory}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white transition-colors p-1"
            title="Cancel and discard uncaptioned photos"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 flex-shrink-0">
          <div
            className="h-full bg-[#383D31] transition-all duration-300 ease-out"
            style={{ width: `${((currentIndex + 1) / localPhotos.length) * 100}%` }}
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Photo Preview */}
          <div className="relative aspect-[3/2] bg-gray-100 rounded-xl overflow-hidden">
            {currentPhoto.preview ? (
              <img
                src={currentPhoto.preview}
                alt="Photo preview"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Preview unavailable
              </div>
            )}

            {/* Portrait Warning */}
            {currentPhoto.orientation === 'portrait' && (
              <div className="absolute top-3 left-3 right-3 bg-amber-500 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Portrait photo — Landscape is preferred for listings</span>
              </div>
            )}
          </div>

          {/* File Name */}
          <p className="text-sm text-gray-500">
            {currentPhoto.fileName || 'Unknown file'}
          </p>

          {/* Caption Input */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              Caption <span className="text-red-500">*</span>
            </label>
            <input
              ref={captionInputRef}
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g., "Kitchen 1", "Master Bath", "Pool View"'
              className="w-full text-lg border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#383D31] focus:border-transparent outline-none"
              maxLength={50}
              autoFocus
            />
            <p className="text-sm text-gray-400 mt-1.5">
              {caption.length}/50 — A brief label for this photo
            </p>
          </div>

          {/* Subcategory Dropdown */}
          {subcategories && subcategories.length > 0 && (
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-2">
                Room Type
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full text-lg border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#383D31] focus:border-transparent outline-none"
              >
                <option value="">— Select room type —</option>
                {subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              {subCategory === '' && caption.trim().length > 0 && (
                <p className="text-red-500 text-sm mt-1 font-medium">
                  Please select a room type to continue
                </p>
              )}
            </div>
          )}

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium">Remove this photo</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-[#383D31] text-white text-lg font-semibold rounded-lg hover:bg-[#2a2e24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLastPhoto ? 'Done — Add Photos' : 'Next Photo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
