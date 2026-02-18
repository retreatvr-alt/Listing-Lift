"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, LogOut, Filter, Search, ChevronRight, Camera, Clock, CheckCircle, AlertCircle, Sliders } from "lucide-react";

interface Submission {
  id: string;
  submissionNumber: string;
  homeownerName: string;
  email: string;
  propertyAddress: string;
  city?: string;
  status: string;
  createdAt: string;
  _count: { photos: number };
}

function DashboardContent() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
        fetchSubmissions();
      }
    };
    init();
  }, [checkSession]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSubmissions();
    }
  }, [isAuthenticated, statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/submissions?${params.toString()}`);
      const data = await res.json();
      setSubmissions(data?.submissions ?? []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-amber-100 text-amber-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Scheduled for Deletion': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New': return <Clock className="w-4 h-4" />;
      case 'In Progress': return <Camera className="w-4 h-4" />;
      case 'Completed': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredSubmissions = (submissions ?? []).filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub?.submissionNumber?.toLowerCase?.()?.includes?.(query) ||
      sub?.homeownerName?.toLowerCase?.()?.includes?.(query) ||
      sub?.email?.toLowerCase?.()?.includes?.(query) ||
      sub?.propertyAddress?.toLowerCase?.()?.includes?.(query)
    );
  });

  if (isAuthenticated === null || (isAuthenticated && loading && submissions.length === 0)) {
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
              <h1 className="font-bold text-[#383D31]">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Listing Lift</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 text-gray-600 hover:text-[#383D31] transition-colors"
            >
              <Sliders className="w-5 h-5" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="flex items-center gap-2 text-gray-600 hover:text-[#383D31] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, address, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#383D31] focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Scheduled for Deletion">Scheduled for Deletion</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', count: submissions?.length ?? 0, color: 'bg-gray-100' },
            { label: 'New', count: submissions?.filter?.(s => s?.status === 'New')?.length ?? 0, color: 'bg-blue-100' },
            { label: 'In Progress', count: submissions?.filter?.(s => s?.status === 'In Progress')?.length ?? 0, color: 'bg-amber-100' },
            { label: 'Completed', count: submissions?.filter?.(s => s?.status === 'Completed')?.length ?? 0, color: 'bg-green-100' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
              <div className="text-2xl font-bold text-[#383D31]">{stat.count}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Submissions list */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#383D31]" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No submissions found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSubmissions.map((submission) => (
                <Link
                  key={submission?.id}
                  href={`/admin/submissions/${submission?.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-gray-500">#{submission?.submissionNumber}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(submission?.status ?? '')}`}>
                        {getStatusIcon(submission?.status ?? '')}
                        {submission?.status}
                      </span>
                    </div>
                    <div className="font-semibold text-[#383D31]">{submission?.homeownerName}</div>
                    <div className="text-sm text-gray-600">{submission?.propertyAddress}{submission?.city ? `, ${submission.city}` : ''}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {submission?._count?.photos ?? 0} photos • {new Date(submission?.createdAt ?? '').toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return <DashboardContent />;
}
