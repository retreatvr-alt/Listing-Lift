"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Loader2, ArrowLeft, User, Mail, Phone, MapPin, FileText, 
  Camera, CheckCircle, XCircle, X, RotateCcw, Star, Download, 
  ChevronLeft, ChevronRight, ChevronDown, Sliders, Send, Archive, History, Clock
} from "lucide-react";
import { toast } from "sonner";
import { ROOM_PROMPTS, INTENSITY_MODIFIERS, ROOM_CATEGORIES } from "@/lib/enhancement-prompts";
import { MODEL_OPTIONS, DEFAULT_MODEL_ID, MODEL_DISPLAY_NAMES } from "@/lib/model-configs";
import {
  ENHANCEMENT_PRESET_CATEGORIES,
  PRESET_MAP,
  getCategoriesForRoom,
  isCategoryRelevantToRoom,
  buildPresetPromptText,
  legacyTogglesToPresetIds,
} from "@/lib/enhancement-presets";

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
    model?: string;
    skyReplacement: boolean;
    bedFixing: boolean;
    windowRecovery: boolean;
    brightness: boolean;
    perspective: boolean;
    reflection: boolean;
    additionalNotes?: string;
    presetIds?: string;
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
  reviewStatus?: string;
  retakeRound?: number;
  retakesSentAt?: string;
  deliveredAt?: string;
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
  const [enhancingPhotos, setEnhancingPhotos] = useState<Set<string>>(new Set());
  const [enhanceSettings, setEnhanceSettings] = useState({
    intensity: 'Moderate',
    model: DEFAULT_MODEL_ID,
    additionalNotes: '',
    selectedPresets: new Set<string>(),
  });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Helper to check if a specific photo is enhancing
  const isPhotoEnhancing = (id: string) => enhancingPhotos.has(id);
  const [actionNotes, setActionNotes] = useState('');
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [roomSettingsMap, setRoomSettingsMap] = useState<Map<string, any>>(new Map());

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
        // Update selectedPhoto with fresh data from the submission
        setSelectedPhoto(prev => {
          if (!prev && data.submission?.photos?.length > 0) {
            return data.submission.photos[0];
          }
          if (prev) {
            const freshPhoto = data.submission.photos.find((p: Photo) => p.id === prev.id);
            return freshPhoto || prev;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to fetch submission:', error);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkSession();
      setIsAuthenticated(authenticated);
      if (authenticated && submissionId) {
        fetchSubmission();
        // Fetch room-specific default settings
        fetch('/api/admin/settings')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.settings) {
              const map = new Map<string, any>(data.settings.map((s: any) => [s.roomKey, s]));
              setRoomSettingsMap(map);
            }
          })
          .catch(err => console.error('Failed to fetch room settings:', err));
      }
    };
    init();
  }, [checkSession, submissionId, fetchSubmission]);

  // Resolve S3 URLs for all photos and their enhancement versions when submission loads
  useEffect(() => {
    if (!submission?.photos) return;
    
    const resolveUrls = async () => {
      const urls: Record<string, string> = {};
      for (const photo of submission.photos) {
        // Resolve original URL
        if (photo.originalUrl && !photo.originalUrl.startsWith('http')) {
          const resolved = await getS3Url(photo.originalUrl);
          if (resolved) urls[photo.originalUrl] = resolved;
        }
        // Resolve enhanced URL
        if (photo.enhancedUrl && !photo.enhancedUrl.startsWith('http')) {
          const resolved = await getS3Url(photo.enhancedUrl);
          if (resolved) urls[photo.enhancedUrl] = resolved;
        }
        // Resolve all enhancement version URLs (for history viewer)
        if (photo.enhancementVersions) {
          for (const version of photo.enhancementVersions) {
            if (version.enhancedUrl && !version.enhancedUrl.startsWith('http') && !urls[version.enhancedUrl]) {
              const resolved = await getS3Url(version.enhancedUrl);
              if (resolved) urls[version.enhancedUrl] = resolved;
            }
          }
        }
      }
      setResolvedUrls(prev => ({ ...prev, ...urls }));
    };
    
    resolveUrls();
  }, [submission]);

  // Poll for updates when photos are being enhanced
  useEffect(() => {
    if (enhancingPhotos.size === 0) return;
    
    const interval = setInterval(() => {
      fetchSubmission();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [enhancingPhotos.size, fetchSubmission]);

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

  // Helper to get resolved URL synchronously from cache
  const getResolvedUrl = (path: string | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return resolvedUrls[path] || '';
  };

  // Build the ACTUAL prompt that would be sent to the API
  const buildCurrentPrompt = (): string => {
    if (!selectedPhoto) return '';

    const roomKey = selectedPhoto.subCategory || selectedPhoto.roomCategory;
    let prompt = ROOM_PROMPTS[roomKey] || ROOM_PROMPTS[selectedPhoto.roomCategory] || ROOM_PROMPTS["Kitchen"];
    prompt += INTENSITY_MODIFIERS[enhanceSettings.intensity] || INTENSITY_MODIFIERS["Moderate"];

    const presetIds = Array.from(enhanceSettings.selectedPresets);
    if (presetIds.length > 0) {
      prompt += buildPresetPromptText(presetIds);
    }

    if (enhanceSettings.additionalNotes) {
      prompt += `\n\nADMIN NOTES:\n${enhanceSettings.additionalNotes}`;
    }

    return prompt;
  };

  const handleEnhance = () => {
    if (!selectedPhoto) return;
    
    const photoId = selectedPhoto.id;
    const photoCaption = selectedPhoto.caption;
    
    // Add photo to enhancing set
    setEnhancingPhotos(prev => new Set(prev).add(photoId));
    
    // Mark photo as enhancing in local state
    setSelectedPhoto(prev => prev ? { ...prev, status: 'Enhancing' } : null);
    
    // Close prompt editor
    setShowPromptEditor(false);

    const body: Record<string, unknown> = {
      intensity: enhanceSettings.intensity,
      model: enhanceSettings.model,
      additionalNotes: enhanceSettings.additionalNotes,
      presetIds: Array.from(enhanceSettings.selectedPresets),
    };
    
    // If the user edited the prompt, send it as customPrompt
    if (showPromptEditor && customPrompt.trim()) {
      body.customPrompt = customPrompt.trim();
    }

    // Fire-and-forget: don't await, use .then()/.catch()/.finally()
    fetch(`/api/photos/${photoId}/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && result?.status === 'completed') {
          toast.success(`"${photoCaption}" enhanced successfully!`);
          // Refresh submission data to get new URLs
          fetchSubmission();
        } else {
          const errorMsg = result?.error || 'Enhancement failed';
          toast.error(`Failed to enhance "${photoCaption}": ${errorMsg}`);
        }
      })
      .catch((error) => {
        console.error('Enhancement failed:', error);
        toast.error(`Enhancement failed for "${photoCaption}". Please try again.`);
      })
      .finally(() => {
        // Remove photo from enhancing set
        setEnhancingPhotos(prev => {
          const next = new Set(prev);
          next.delete(photoId);
          return next;
        });
      });
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
    
    const newIsHero = !selectedPhoto.isHero;

    try {
      await fetch(`/api/photos/${selectedPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHero: newIsHero })
      });
      
      // If setting as hero and no hero URL, generate it
      if (newIsHero && selectedPhoto.enhancedUrl && !selectedPhoto.heroUrl) {
        fetch(`/api/photos/${selectedPhoto.id}/generate-hero`, { method: 'POST' });
        alert('Hero version generating in background...');
      }
      
      setSelectedPhoto(prev => prev ? { ...prev, isHero: newIsHero } : null);
      await fetchSubmission();
    } catch (error) {
      console.error('Toggle hero failed:', error);
    }
  };

  const handleRoomChange = async (photoId: string, newRoom: string) => {
    try {
      // Determine if new room needs subcategory cleared
      const newCat = ROOM_CATEGORIES.find(c => c.id === newRoom);
      const updateData: Record<string, unknown> = { roomCategory: newRoom };

      // If new room doesn't have subcategories, clear subCategory
      if (!newCat?.hasSubcategories) {
        updateData.subCategory = null;
      } else {
        // If switching TO a room with subcategories, clear existing subCategory
        // (user will need to pick from the new subcategory dropdown)
        updateData.subCategory = null;
      }

      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) throw new Error('Failed to update room');

      toast.success(`Moved to ${newRoom}`);

      // Re-fetch submission to update sidebar grouping
      await fetchSubmission();

      // Update selectedPhoto with new room
      setSelectedPhoto(prev => prev ? { ...prev, roomCategory: newRoom, subCategory: updateData.subCategory as string | undefined } : null);

      // Auto-trigger re-enhancement with new room prompt if photo was already enhanced
      const photo = submission?.photos.find(p => p.id === photoId);
      if (photo?.enhancedUrl) {
        toast.info('Re-enhancing with correct room prompt...');
        handleEnhance();
      }
    } catch (error) {
      console.error('Room change failed:', error);
      toast.error('Failed to change room');
    }
  };

  const handleSubCategoryChange = async (photoId: string, newSubCategory: string | null) => {
    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subCategory: newSubCategory })
      });

      if (!res.ok) throw new Error('Failed to update subcategory');

      toast.success(newSubCategory ? `Set to ${newSubCategory}` : 'Subcategory cleared');

      await fetchSubmission();
      setSelectedPhoto(prev => prev ? { ...prev, subCategory: newSubCategory || undefined } : null);

      // Auto-trigger re-enhancement with new subcategory prompt if photo was already enhanced
      const photo = submission?.photos.find(p => p.id === photoId);
      if (photo?.enhancedUrl) {
        toast.info('Re-enhancing with correct room prompt...');
        handleEnhance();
      }
    } catch (error) {
      console.error('Subcategory change failed:', error);
      toast.error('Failed to change subcategory');
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
                      {(photos ?? []).map((photo) => {
                        const photoIsEnhancing = isPhotoEnhancing(photo?.id) || photo?.status === 'Enhancing';
                        return (
                          <button
                            key={photo?.id}
                            onClick={() => {
                              setSelectedPhoto(photo);
                              // Load room-specific defaults
                              const roomKey = photo.subCategory || photo.roomCategory;
                              const dbSettings = roomSettingsMap.get(roomKey) || roomSettingsMap.get(photo.roomCategory);

                              // Convert legacy DB room defaults to preset IDs
                              const defaultPresets = new Set<string>();
                              if (dbSettings) {
                                const legacyIds = legacyTogglesToPresetIds(dbSettings);
                                legacyIds.forEach(id => defaultPresets.add(id));
                                setEnhanceSettings({
                                  intensity: dbSettings.defaultIntensity || 'Moderate',
                                  model: dbSettings.defaultModel || DEFAULT_MODEL_ID,
                                  additionalNotes: '',
                                  selectedPresets: defaultPresets,
                                });
                              } else {
                                setEnhanceSettings({
                                  intensity: 'Moderate',
                                  model: DEFAULT_MODEL_ID,
                                  additionalNotes: '',
                                  selectedPresets: new Set(),
                                });
                              }

                              // Auto-expand relevant categories, collapse others
                              const newCollapsed = new Set<string>();
                              ENHANCEMENT_PRESET_CATEGORIES.forEach(cat => {
                                if (cat.id !== "universal" && !isCategoryRelevantToRoom(cat, roomKey)) {
                                  newCollapsed.add(cat.id);
                                }
                              });
                              setCollapsedCategories(newCollapsed);
                            }}
                            className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                              selectedPhoto?.id === photo?.id
                                ? 'border-[#383D31] ring-2 ring-[#383D31]/20'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                          >
                            <div className="relative w-full h-full bg-gray-100">
                              {photo?.originalUrl && (
                                getResolvedUrl(photo.enhancedUrl) || getResolvedUrl(photo.originalUrl) ? (
                                  <img
                                    src={getResolvedUrl(photo.enhancedUrl) || getResolvedUrl(photo.originalUrl)}
                                    alt={photo?.caption || 'Photo'}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                  </div>
                                )
                              )}
                              {/* Enhancing overlay */}
                              {photoIsEnhancing && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                </div>
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Summary */}
            {(() => {
              const approved = submission.photos.filter(p => p.status === 'Approved');
              const rejected = submission.photos.filter(p => p.status === 'Rejected');
              const retakes = submission.photos.filter(p => p.status === 'Re-upload Requested');
              const unreviewed = submission.photos.filter(p => !['Approved', 'Rejected', 'Re-upload Requested'].includes(p.status));
              const allReviewed = unreviewed.length === 0;
              const heroCount = submission.photos.filter(p => p.isHero).length;

              return (
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h3 className="font-semibold text-[#383D31] mb-3">Review Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-600">✅ Approved</span>
                      <span className="font-medium">{approved.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">🔄 Need Retakes</span>
                      <span className="font-medium">{retakes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-500">❌ Rejected</span>
                      <span className="font-medium">{rejected.length}</span>
                    </div>
                    {unreviewed.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">⏳ Not reviewed</span>
                        <span className="font-medium">{unreviewed.length}</span>
                      </div>
                    )}
                    {heroCount > 0 && (
                      <div className="flex justify-between pt-2 border-t mt-2">
                        <span className="text-amber-700">⭐ Hero photos</span>
                        <span className="font-medium">{heroCount}</span>
                      </div>
                    )}
                  </div>

                  {(submission.retakeRound ?? 0) > 0 && (
                    <div className="mt-2 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">
                      Retake Round {submission.retakeRound}
                    </div>
                  )}

                  {submission.reviewStatus === 'retakes_pending' && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      ⏳ Waiting for client retakes...
                    </div>
                  )}

                  {submission.reviewStatus === 'delivered' && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      ✅ Photos delivered to client
                    </div>
                  )}

                  {allReviewed && approved.length > 0 && submission.reviewStatus !== 'delivered' && (
                    <button
                      onClick={async () => {
                        if (!confirm(
                          retakes.length > 0
                            ? `Send retake request for ${retakes.length} photo(s) to ${submission.homeownerName}?`
                            : `Deliver ${approved.length} enhanced photo(s) to ${submission.homeownerName}?`
                        )) return;

                        try {
                          const res = await fetch(`/api/submissions/${submission.id}/complete-review`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          const result = await res.json();
                          if (res.ok && result.success) {
                            if (result.outcome === 'retakes_sent') {
                              toast.success(`Retake request sent! (${result.retakeCount} photos, round ${result.round})`);
                            } else {
                              toast.success(`Photos delivered to ${submission.homeownerName}!`);
                            }
                            fetchSubmission();
                          } else {
                            toast.error(result.error || 'Failed to complete review');
                          }
                        } catch (err) {
                          toast.error('Failed to complete review');
                        }
                      }}
                      className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg font-medium ${
                        retakes.length > 0
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      {retakes.length > 0 ? 'Send Retake Requests' : 'Deliver to Client'}
                    </button>
                  )}
                </div>
              );
            })()}

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
                <a 
                  href={`/api/submissions/${submission.id}/download-zip`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24]"
                >
                  <Download className="w-4 h-4" />
                  Download All (ZIP)
                </a>
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
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={selectedPhoto.roomCategory}
                          onChange={(e) => handleRoomChange(selectedPhoto.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-600"
                        >
                          {ROOM_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        {(() => {
                          const currentCat = ROOM_CATEGORIES.find(c => c.id === selectedPhoto.roomCategory);
                          if (currentCat?.hasSubcategories && currentCat.subcategories) {
                            return (
                              <select
                                value={selectedPhoto.subCategory || ''}
                                onChange={(e) => handleSubCategoryChange(selectedPhoto.id, e.target.value || null)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-600"
                              >
                                <option value="">Select type...</option>
                                {currentCat.subcategories.map((sub) => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            );
                          }
                          return null;
                        })()}
                      </div>
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
                      <div 
                        className="relative aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#383D31] transition-all"
                        onClick={() => {
                          const url = getResolvedUrl(selectedPhoto.originalUrl);
                          if (url) setLightboxUrl(url);
                        }}
                        title="Click to view full size"
                      >
                        {selectedPhoto.originalUrl && (
                          getResolvedUrl(selectedPhoto.originalUrl) ? (
                            <img
                              src={getResolvedUrl(selectedPhoto.originalUrl)}
                              alt="Original"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2 text-center">ENHANCED</div>
                      <div 
                        className={`relative aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden ${selectedPhoto.enhancedUrl ? 'cursor-pointer hover:ring-2 hover:ring-[#383D31] transition-all' : ''}`}
                        onClick={() => {
                          const url = getResolvedUrl(selectedPhoto.enhancedUrl);
                          if (url) setLightboxUrl(url);
                        }}
                        title={selectedPhoto.enhancedUrl ? "Click to view full size" : ""}
                      >
                        {selectedPhoto.enhancedUrl ? (
                          getResolvedUrl(selectedPhoto.enhancedUrl) ? (
                            <img
                              src={getResolvedUrl(selectedPhoto.enhancedUrl)}
                              alt="Enhanced"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                          )
                        ) : (isPhotoEnhancing(selectedPhoto.id) || selectedPhoto.status === 'Enhancing') ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                            <span>Enhancing...</span>
                          </div>
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
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${selectedPhoto.isHero ? 'fill-amber-500' : ''}`} />
                      {selectedPhoto.isHero ? 'Remove Hero' : 'Set as Hero'}
                    </button>
                  </div>
                </div>

                {/* Enhancement controls */}
                <div className="bg-white rounded-xl shadow-md p-4">
                  <h3 className="font-semibold text-[#383D31] mb-4 flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Enhancement Settings
                  </h3>

                  <div className="space-y-4">
                    {/* Model Selector */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">AI Model</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MODEL_OPTIONS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setEnhanceSettings(prev => ({ ...prev, model: model.id }))}
                            className={`relative p-3 rounded-lg text-left transition-all ${
                              enhanceSettings.model === model.id
                                ? 'bg-[#383D31]/5 border-2 border-[#383D31]'
                                : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">{model.label}</span>
                              {model.badge && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  model.badge === 'Default' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {model.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

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

                    {/* Enhancement Presets */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        Enhancement Presets
                        {enhanceSettings.selectedPresets.size > 0 && (
                          <span className="text-xs text-[#383D31] bg-[#383D31]/10 px-2 py-0.5 rounded-full">
                            {enhanceSettings.selectedPresets.size} selected
                          </span>
                        )}
                      </label>

                      <div className="space-y-2">
                        {(() => {
                          const roomKey = selectedPhoto?.subCategory || selectedPhoto?.roomCategory || '';
                          const sortedCategories = getCategoriesForRoom(roomKey);

                          return sortedCategories.map((category) => {
                            const isRelevant = isCategoryRelevantToRoom(category, roomKey);
                            const isUniversal = category.id === "universal";
                            const isCollapsed = collapsedCategories.has(category.id);
                            const selectedInCategory = category.presets.filter(
                              p => enhanceSettings.selectedPresets.has(p.id)
                            ).length;

                            return (
                              <div
                                key={category.id}
                                className={`border rounded-lg overflow-hidden ${
                                  isRelevant
                                    ? 'border-[#383D31]/30 bg-[#383D31]/[0.02]'
                                    : 'border-gray-200'
                                }`}
                              >
                                {/* Category header */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCollapsedCategories(prev => {
                                      const next = new Set(prev);
                                      if (next.has(category.id)) {
                                        next.delete(category.id);
                                      } else {
                                        next.add(category.id);
                                      }
                                      return next;
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-left ${
                                    isRelevant
                                      ? 'bg-[#383D31]/5 hover:bg-[#383D31]/10'
                                      : 'bg-gray-50 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${
                                      isRelevant ? 'text-[#383D31]' : 'text-gray-600'
                                    }`}>
                                      {category.label}
                                    </span>
                                    {isRelevant && !isUniversal && (
                                      <span className="text-xs bg-[#383D31]/10 text-[#383D31] px-1.5 py-0.5 rounded">
                                        Recommended
                                      </span>
                                    )}
                                    {selectedInCategory > 0 && (
                                      <span className="text-xs bg-[#383D31] text-white px-1.5 py-0.5 rounded-full">
                                        {selectedInCategory}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                                    isCollapsed ? '-rotate-90' : ''
                                  }`} />
                                </button>

                                {/* Presets list */}
                                {!isCollapsed && (
                                  <div className="px-3 py-2 space-y-1">
                                    {category.presets.map((preset) => (
                                      <label
                                        key={preset.id}
                                        className="flex items-start gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={enhanceSettings.selectedPresets.has(preset.id)}
                                          onChange={(e) => {
                                            setEnhanceSettings(prev => {
                                              const next = new Set(prev.selectedPresets);
                                              if (e.target.checked) {
                                                next.add(preset.id);
                                              } else {
                                                next.delete(preset.id);
                                              }
                                              return { ...prev, selectedPresets: next };
                                            });
                                          }}
                                          className="rounded text-[#383D31] mt-0.5"
                                        />
                                        <div>
                                          <span className="text-sm font-medium">{preset.label}</span>
                                          <p className="text-xs text-gray-500">{preset.description}</p>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
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

                    {/* Edit Prompt */}
                    <div>
                      <button
                        onClick={() => {
                          if (!showPromptEditor) {
                            // When opening, populate with the ACTUAL current prompt
                            setCustomPrompt(buildCurrentPrompt());
                          }
                          setShowPromptEditor(!showPromptEditor);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        {showPromptEditor ? 'Hide prompt editor' : 'Edit prompt'}
                      </button>
                      {showPromptEditor && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm font-mono"
                            rows={12}
                            placeholder="Custom enhancement prompt..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCustomPrompt(buildCurrentPrompt())}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              Reset to current defaults
                            </button>
                            <span className="text-xs text-gray-400">|</span>
                            <span className="text-xs text-gray-400">{customPrompt.length} chars</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhance button */}
                    <button
                      onClick={handleEnhance}
                      disabled={isPhotoEnhancing(selectedPhoto.id) || selectedPhoto?.status === 'Enhancing'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24] disabled:opacity-50"
                    >
                      {(isPhotoEnhancing(selectedPhoto.id) || selectedPhoto?.status === 'Enhancing') ? (
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

                {/* Enhancement History */}
                {selectedPhoto.enhancementVersions && selectedPhoto.enhancementVersions.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md p-4">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="w-full flex items-center justify-between"
                    >
                      <h3 className="font-semibold text-[#383D31] flex items-center gap-2">
                        <History className="w-4 h-4" /> Enhancement History ({selectedPhoto.enhancementVersions.length})
                      </h3>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {showHistory && (
                      <div className="mt-4 space-y-3">
                        {selectedPhoto.enhancementVersions.map((version) => {
                          const versionUrl = getResolvedUrl(version.enhancedUrl);
                          const activeToggles = (() => {
                            // New records: use presetIds JSON
                            if (version.presetIds) {
                              try {
                                const ids: string[] = JSON.parse(version.presetIds);
                                return ids.map(id => PRESET_MAP[id]?.label || id);
                              } catch { /* fall through to legacy */ }
                            }
                            // Legacy records: use boolean fields
                            return [
                              version.skyReplacement && 'Sky',
                              version.bedFixing && 'Bed',
                              version.windowRecovery && 'Window',
                              version.brightness && 'Brightness',
                              version.perspective && 'Perspective',
                              version.reflection && 'Reflection',
                            ].filter(Boolean);
                          })();
                          
                          return (
                            <div key={version.id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex gap-3">
                                {/* Thumbnail */}
                                <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                  {versionUrl ? (
                                    <img
                                      src={versionUrl}
                                      alt={`Version ${version.versionNumber}`}
                                      className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                      onClick={() => setLightboxUrl(versionUrl)}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <Camera className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-[#383D31]">
                                      Version {version.versionNumber}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {/* Use as current */}
                                      <button
                                        onClick={async () => {
                                          try {
                                            await fetch(`/api/photos/${selectedPhoto.id}`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ enhancedUrl: version.enhancedUrl, status: 'Enhanced' })
                                            });
                                            setSelectedPhoto(prev => prev ? { ...prev, enhancedUrl: version.enhancedUrl, status: 'Enhanced' } : null);
                                            await fetchSubmission();
                                          } catch (err) {
                                            console.error('Failed to set version:', err);
                                          }
                                        }}
                                        className="text-xs px-2 py-1 bg-[#383D31] text-white rounded hover:bg-[#2a2e24]"
                                        title="Use this version as the current enhanced photo"
                                      >
                                        Use
                                      </button>
                                      {/* Download */}
                                      {versionUrl && (
                                        <a
                                          href={versionUrl}
                                          download={`${selectedPhoto.caption}-v${version.versionNumber}.jpg`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                          title="Download this version"
                                        >
                                          <Download className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                      {MODEL_DISPLAY_NAMES[version.model || ''] || 'GPT Image 1.5'}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      version.intensity === 'Light' ? 'bg-green-100 text-green-700' :
                                      version.intensity === 'Moderate' ? 'bg-blue-100 text-blue-700' :
                                      'bg-purple-100 text-purple-700'
                                    }`}>
                                      {version.intensity}
                                    </span>
                                    {activeToggles.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        +{activeToggles.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                    <Clock className="w-3 h-3" />
                                    {new Date(version.createdAt).toLocaleDateString()} {new Date(version.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  
                                  {version.additionalNotes && (
                                    <p className="text-xs text-gray-500 mt-1 truncate" title={version.additionalNotes}>
                                      Notes: {version.additionalNotes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default function SubmissionDetailPage() {
  return <SubmissionDetailContent />;
}
