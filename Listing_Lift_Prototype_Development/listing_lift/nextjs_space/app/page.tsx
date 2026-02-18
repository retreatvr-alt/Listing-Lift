import Image from "next/image";
import Link from "next/link";
import { Camera, Sparkles, Clock, CheckCircle, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f7f4] to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 md:w-16 md:h-16">
              <Image
                src="/retreat-vr-logo.png"
                alt="Retreat Vacation Rentals"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[#383D31]">Retreat Vacation Rentals</p>
              <p className="text-xs text-gray-500">Property Management</p>
            </div>
          </div>
          <Link
            href="/submit"
            className="bg-[#383D31] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2a2e24] transition-all"
          >
            Start Submission
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Listing Lift Logo - Prominent placement */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto mb-4 rounded-2xl overflow-hidden bg-[#eae7e1]">
            <Image
              src="/listing-lift-logo.png"
              alt="Listing Lift"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-sm text-gray-500 mb-6">by Retreat Vacation Rentals</p>
          
          <h1 className="text-2xl md:text-4xl font-bold text-[#383D31] mb-6">
            Transform Your Listing Photos with <span className="text-[#5a6349]">AI Enhancement</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            Submit your vacation rental photos and let our AI enhancement technology make them shine. 
            Professional quality results that drive more bookings.
          </p>
          <p className="text-base text-[#5a6349] font-medium mb-8 max-w-lg mx-auto">
            No need to take photos ahead of time — we&apos;ll walk you through each room with tips for the best shots from your phone.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-[#383D31] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#2a2e24] transition-all shadow-lg hover:shadow-xl"
          >
            Start Submission
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-500 mt-4">Submit and forget — we handle everything</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-[#383D31] mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-[#f9f7f4]">
              <div className="w-16 h-16 bg-[#383D31] rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-lg mb-2">1. Follow Our Guided Process</h4>
              <p className="text-gray-600">
                We&apos;ll walk you through each room with photography tips. Just grab your phone and follow along!
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#f9f7f4]">
              <div className="w-16 h-16 bg-[#383D31] rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-lg mb-2">2. AI Enhancement</h4>
              <p className="text-gray-600">
                Our AI enhances your photos — brightening, straightening, and making them listing-ready.
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-[#f9f7f4]">
              <div className="w-16 h-16 bg-[#383D31] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-lg mb-2">3. Review & Download</h4>
              <p className="text-gray-600">
                We review and approve enhanced photos, then send you the final polished images.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What AI Can Fix */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-center text-[#383D31] mb-12">What Our AI Can Enhance</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "☀️", title: "Lighting", desc: "Brighten dark photos and balance exposure" },
              { icon: "📐", title: "Straightening", desc: "Fix tilted framing and vertical lines" },
              { icon: "🌤️", title: "Sky Replacement", desc: "Replace overcast skies with blue skies" },
              { icon: "🪟", title: "Window Recovery", desc: "Reveal exterior views through blown-out windows" },
              { icon: "🛏️", title: "Bed Smoothing", desc: "Smooth wrinkly linens for a crisp look" },
              { icon: "🪞", title: "Reflection Removal", desc: "Remove photographer reflections from mirrors" },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h4 className="font-semibold text-[#383D31] mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#383D31] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Elevate Your Listing?</h3>
          <p className="text-lg text-gray-300 mb-8">
            Upload up to 60 photos and let our AI work its magic.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 bg-white text-[#383D31] px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all"
          >
            Start Your Submission
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#2a2e24] text-gray-400">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-sm">© 2025 Retreat Vacation Rentals. All rights reserved.</span>
          <div className="flex gap-6 text-sm">
            <a href="mailto:dan@retreatvr.ca" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
