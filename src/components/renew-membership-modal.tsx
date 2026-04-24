"use client";

import { useState } from "react";
import { X, CreditCard, Smartphone } from "lucide-react";

interface Props {
  membershipType: string;
  fee: { amount: string } | null;
  buttonLabel?: string;
  buttonClassName?: string;
}

const ZELLE_RECIPIENT = "treasurer@tgroc.org";

export function RenewMembershipButton({
  membershipType,
  fee,
  buttonLabel = "Renew Membership",
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Renew Membership</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Fee */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-600 font-medium mb-1">
                  {membershipType} Membership Renewal
                </p>
                {fee ? (
                  <p className="text-3xl font-bold text-blue-800">
                    ${Number(fee.amount).toFixed(2)}
                    <span className="text-base font-normal text-blue-500 ml-1">/ year</span>
                  </p>
                ) : (
                  <p className="text-sm text-blue-700">
                    Please contact an officer for current pricing.
                  </p>
                )}
              </div>

              {/* Payment instructions */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <p className="font-semibold text-gray-800 text-sm">How to Pay via Zelle</p>
                </div>
                <ol className="space-y-2.5 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    Open your bank app and go to <strong>Zelle</strong>.
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                    Send payment to{" "}
                    <strong className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-blue-700">
                      {ZELLE_RECIPIENT}
                    </strong>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                    In the memo, include your <strong>full name</strong> and <strong>membership renewal</strong>.
                  </li>
                </ol>
              </div>

              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                ⏳ Once your payment is received, a portal admin will update your membership. You will receive a confirmation email when your membership is renewed.
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
