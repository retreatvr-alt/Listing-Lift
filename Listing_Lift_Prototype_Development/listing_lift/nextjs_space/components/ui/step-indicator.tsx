"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function StepIndicator({ currentStep, totalSteps, stepLabels }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-[#383D31] rounded-full transition-all duration-300"
            style={{ width: `${((currentStep) / totalSteps) * 100}%` }}
          />
        </div>
        
        {/* Step dots */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                index < currentStep
                  ? 'bg-[#383D31] text-white'
                  : index === currentStep
                  ? 'bg-[#383D31] text-white ring-4 ring-[#383D31]/20'
                  : 'bg-gray-300 text-gray-500'
              }`}
            >
              {index < currentStep ? (
                <Check className="w-3 h-3" />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Step label */}
      {stepLabels && stepLabels[currentStep] && (
        <p className="text-center text-sm text-gray-600 mt-4">
          Step {currentStep + 1} of {totalSteps}: {stepLabels[currentStep]}
        </p>
      )}
    </div>
  );
}
