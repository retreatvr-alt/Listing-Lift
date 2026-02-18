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
