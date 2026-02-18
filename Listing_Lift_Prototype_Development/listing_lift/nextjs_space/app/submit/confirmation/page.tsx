"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Home, Mail } from "lucide-react";
import { Suspense } from "react";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams?.get?.('id') || 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f7f4] to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
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
            <span className="font-semibold text-[#383D31]">Listing Lift</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-[#383D31] mb-4">
            Submission Received!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for your photo submission. We&apos;ll enhance your photos and get back to you soon.
          </p>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="text-sm text-gray-500 mb-1">Your Submission ID</div>
            <div className="text-2xl font-mono font-bold text-[#383D31]">
              {submissionId}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Save this ID for your records. You&apos;ll also receive a confirmation email.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-8 text-left">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">What happens next?</h3>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• We&apos;ll review and enhance your photos</li>
                  <li>• You&apos;ll receive an email when photos are ready</li>
                  <li>• If any photos need re-upload, we&apos;ll send instructions</li>
                </ul>
              </div>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#383D31] hover:underline"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#383D31]"></div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
