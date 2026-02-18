"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, LogOut, ArrowLeft, ChevronDown, ChevronRight, Save, RotateCcw } from "lucide-react";
import { toast, Toaster } from "sonner";
import { MODEL_OPTIONS, DEFAULT_MODEL_ID } from "@/lib/model-configs";
import { ROOM_PROMPTS } from "@/lib/enhancement-prompts";

interface RoomSettings {
  roomKey: string;
  defaultModel: string;
  defaultIntensity: string;
  skyReplacement: boolean;
  bedFixing: boolean;
  windowRecovery: boolean;
  brightness: boolean;
  perspective: boolean;
  reflection: boolean;
  customPrompt: string | null;
  hasDbRecord: boolean;
}

const INTENSITIES = ["Light", "Moderate", "Significant"];

const ROOM_GROUPS = [
  {
    name: "Main Rooms",
    rooms: ["Kitchen", "Bedroom", "Bathroom", "Pool/Hot Tub"]
  },
  {
    name: "Living Spaces",
    rooms: ["Living Room", "Dining Room/Dining Area", "Foyer/Entryway", "Home Theater", "Game Room"]
  },
  {
    name: "Exterior",
    rooms: ["Building Exterior", "Lawn/Backyard", "Miscellaneous"]
  }
];

const DEFAULT_SETTINGS: Omit<RoomSettings, 'roomKey' | 'hasDbRecord'> = {
  defaultModel: DEFAULT_MODEL_ID,
  defaultIntensity: "Moderate",
  skyReplacement: false,
  bedFixing: false,
  windowRecovery: false,
  brightness: false,
  perspective: false,
  reflection: false,
  customPrompt: null
};

function SettingsContent() {
  const router = useRouter();
  const [settings, setSettings] = useState<RoomSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    const init = async () => {
      const authenticated = await checkSession();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        fetchSettings();
      }
    };
    init();
  }, [checkSession]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleRoom = (roomKey: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomKey)) {
      newExpanded.delete(roomKey);
    } else {
      newExpanded.add(roomKey);
    }
    setExpandedRooms(newExpanded);
  };

  const updateSetting = (roomKey: string, field: keyof RoomSettings, value: any) => {
    setSettings(prev => prev.map(s => 
      s.roomKey === roomKey ? { ...s, [field]: value } : s
    ));
  };

  const resetToDefaults = (roomKey: string) => {
    setSettings(prev => prev.map(s =>
      s.roomKey === roomKey
        ? { ...s, ...DEFAULT_SETTINGS, customPrompt: ROOM_PROMPTS[roomKey] || null }
        : s
    ));
    toast.info(`Reset ${roomKey} to defaults (not saved)`);
  };

  const saveSettings = async (roomKey: string) => {
    const setting = settings.find(s => s.roomKey === roomKey);
    if (!setting) return;

    setSaving(roomKey);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting)
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(prev => prev.map(s =>
          s.roomKey === roomKey ? { ...s, ...data.setting } : s
        ));
        toast.success(`${roomKey} settings saved`);
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  if (isAuthenticated === null || (isAuthenticated && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f7f4]">
        <Loader2 className="w-8 h-8 animate-spin text-[#383D31]" />
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#eae7e1]">
              <Image
                src="/listing-lift-logo.png"
                alt="Listing Lift"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="font-bold text-[#383D31]">Enhancement Settings</h1>
              <p className="text-xs text-gray-500">Per-room defaults</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex items-center gap-2 text-gray-600 hover:text-[#383D31] transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#383D31] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="mb-6">
          <p className="text-gray-600">
            Configure default enhancement settings for each room type. These settings will be used during auto-enhancement and as defaults for manual enhancements.
          </p>
        </div>

        {/* Room Groups */}
        <div className="space-y-8">
          {ROOM_GROUPS.map(group => (
            <div key={group.name}>
              <h2 className="text-lg font-semibold text-[#383D31] mb-4">{group.name}</h2>
              <div className="space-y-3">
                {group.rooms.map(roomKey => {
                  const setting = settings.find(s => s.roomKey === roomKey);
                  if (!setting) return null;

                  const isExpanded = expandedRooms.has(roomKey);
                  const isSaving = saving === roomKey;

                  return (
                    <div key={roomKey} className="bg-white rounded-xl shadow-md overflow-hidden">
                      {/* Room Header */}
                      <button
                        onClick={() => toggleRoom(roomKey)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900">{roomKey}</span>
                          {setting.hasDbRecord && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Customized</span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-5">
                          {/* Model Dropdown */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                            <select
                              value={setting.defaultModel}
                              onChange={(e) => updateSetting(roomKey, 'defaultModel', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                            >
                              {MODEL_OPTIONS.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.label} {m.badge && `(${m.badge})`}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Intensity Dropdown */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
                            <select
                              value={setting.defaultIntensity}
                              onChange={(e) => updateSetting(roomKey, 'defaultIntensity', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                            >
                              {INTENSITIES.map(i => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                          </div>

                          {/* Toggle Switches */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Corrections</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {[
                                { key: 'skyReplacement', label: 'Sky Replacement' },
                                { key: 'bedFixing', label: 'Bed Fixing' },
                                { key: 'windowRecovery', label: 'Window Recovery' },
                                { key: 'brightness', label: 'Brightness' },
                                { key: 'perspective', label: 'Perspective' },
                                { key: 'reflection', label: 'Reflection Removal' }
                              ].map(toggle => (
                                <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={setting[toggle.key as keyof RoomSettings] as boolean}
                                    onChange={(e) => updateSetting(roomKey, toggle.key as keyof RoomSettings, e.target.checked)}
                                    className="w-4 h-4 text-[#383D31] border-gray-300 rounded focus:ring-[#383D31]"
                                  />
                                  <span className="text-sm text-gray-700">{toggle.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Enhancement Prompt */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enhancement Prompt</label>
                            <textarea
                              value={setting.customPrompt || ''}
                              onChange={(e) => updateSetting(roomKey, 'customPrompt', e.target.value || null)}
                              rows={12}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">This is the prompt sent to the AI model during auto-enhancement. Edit as needed.</p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => saveSettings(roomKey)}
                              disabled={isSaving}
                              className="flex items-center gap-2 px-4 py-2 bg-[#383D31] text-white rounded-lg hover:bg-[#2a2e24] disabled:opacity-50 transition-colors"
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => resetToDefaults(roomKey)}
                              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Reset to Defaults
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
