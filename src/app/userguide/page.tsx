"use client";

export default function UserGuidePage() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { break-before: page; }
        }
        @page {
          margin: 1.8cm 2cm;
          size: A4;
        }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors"
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      {/* Document */}
      <div className="max-w-[820px] mx-auto px-8 py-10 bg-white min-h-screen text-gray-900 text-[14px] leading-relaxed print:px-0 print:py-0">

        {/* Cover */}
        <div className="text-center mb-12 pb-8 border-b-2 border-indigo-200">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-4xl mb-4">
            🎭
          </div>
          <h1 className="text-3xl font-bold text-indigo-700 tracking-tight">TGROC Member Portal</h1>
          <p className="text-lg text-gray-500 mt-1">Tamils of Greater Rochester</p>
          <p className="text-base font-semibold text-gray-700 mt-4">Member User Guide</p>
          <p className="text-sm text-gray-400 mt-1">Revised April 2026</p>
        </div>

        {/* Table of Contents */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            Table of Contents
          </h2>
          <ol className="space-y-1 list-decimal list-inside text-gray-600">
            <li>Getting Started</li>
            <li>Creating Your Account</li>
            <li>Logging In</li>
            <li>Member Dashboard</li>
            <li>Managing Your Profile</li>
            <li>Family Members <span className="text-indigo-600 font-semibold">(Important — please read)</span></li>
            <li>Contact Information</li>
            <li>Notification Settings</li>
            <li>Events &amp; RSVPs</li>
            <li>Performance Registration</li>
            <li>Membership Fees &amp; Expiry</li>
            <li>Need Help?</li>
          </ol>
        </section>

        {/* 1 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            1. Getting Started
          </h2>
          <p>
            The TGROC Member Portal is your central hub for managing your membership, registering
            for events, and staying connected with our community. You can access it from any
            web browser — no app download required.
          </p>
          <p className="mt-2">
            <span className="font-semibold">Portal address:</span>{" "}
            <span className="text-indigo-600">https://portal.tgroc.org</span> (or the URL provided
            by your TGROC officer).
          </p>
        </section>

        {/* 2 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            2. Creating Your Account
          </h2>

          {/* IMPORTANT CALLOUT */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-4 mb-4">
            <p className="font-bold text-amber-800 flex items-center gap-2">
              ⚠️ Important — One Account Per Family
            </p>
            <p className="text-amber-800 mt-1">
              For family memberships, <strong>only one person in the family should create a
              portal account.</strong> Once logged in, that person can add their spouse and
              children as <strong>Family Members</strong> from the Profile page.
              Adding them correctly ensures the whole family appears under one membership
              record, avoids duplicate entries, and keeps everything organized for our officers.
            </p>
            <p className="text-amber-700 text-[13px] mt-2">
              If your spouse also needs their own login to manage the account, a TGROC officer
              can set that up for you — please reach out to us.
            </p>
          </div>

          <p className="font-semibold mt-3">Steps to register:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>
              Click <strong>Register</strong> on the portal home page, or go to
              <code className="bg-gray-100 px-1 rounded">/auth/register</code>.
            </li>
            <li>Enter your <strong>first name, last name, email address</strong>, and
              optional phone number and year of birth.
            </li>
            <li>
              Select your <strong>membership type</strong>:
              <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5 text-gray-600">
                <li><strong>Individual</strong> — just you</li>
                <li><strong>Family</strong> — you, your spouse, and/or children</li>
                <li><strong>Student – Individual</strong> — student, single</li>
                <li><strong>Student – Family</strong> — student with family</li>
              </ul>
            </li>
            <li>Choose a secure <strong>password</strong> (minimum 8 characters).</li>
            <li>Click <strong>Create Account</strong>.</li>
          </ol>
          <p className="mt-3 text-gray-600">
            After registration, your account will be in <strong>Pending</strong> status. A TGROC
            officer will review and activate it. You will be able to log in once activated.
          </p>
        </section>

        {/* 3 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            3. Logging In
          </h2>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>
              Go to the portal and click <strong>Login</strong>, or navigate to
              <code className="bg-gray-100 px-1 rounded">/auth/login</code>.
            </li>
            <li>Enter your registered <strong>email</strong> and <strong>password</strong>.</li>
            <li>
              Click <strong>Sign In</strong>. You can also sign in with Google or Facebook if
              you linked those accounts.
            </li>
          </ol>
          <p className="mt-3 text-gray-600 text-[13px]">
            If you see an error about your account being Pending or Inactive, please contact a
            TGROC officer.
          </p>
        </section>

        {/* 4 */}
        <section className="mb-8 page-break">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            4. Member Dashboard
          </h2>
          <p>
            After logging in, you land on your <strong>Member Dashboard</strong>. It provides
            a quick overview of:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li>Your name and membership details</li>
            <li>Membership expiry status (with a warning banner if expiring soon)</li>
            <li>Quick links to upcoming events</li>
            <li>
              A prompt to complete your profile if any required fields are missing
            </li>
            <li>Your family members (for family memberships)</li>
          </ul>
          <p className="mt-3 text-gray-600">
            The left-hand navigation menu takes you to all sections of the portal.
          </p>
        </section>

        {/* 5 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            5. Managing Your Profile
          </h2>
          <p>
            Go to <strong>My Profile</strong> (in the navigation menu) to:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li>Update your first name, last name, and phone number</li>
            <li>Enter your year of birth (optional)</li>
            <li>Change your account password</li>
          </ul>
          <p className="mt-3">
            Click <strong>Save Profile</strong> after making any changes.
          </p>
        </section>

        {/* 6 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            6. Family Members
            <span className="ml-2 text-sm font-normal text-amber-600">(Family memberships only)</span>
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 mb-4">
            <p className="font-bold text-blue-800">📋 Reminder</p>
            <p className="text-blue-800 mt-1">
              Do <strong>not</strong> create separate portal accounts for your spouse or
              children. Instead, add them as Family Members through your own profile. This
              keeps them correctly linked to your family membership.
            </p>
          </div>

          <p className="font-semibold">Adding a family member:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>Go to <strong>My Profile</strong> and scroll to the <strong>Family Members</strong> section.</li>
            <li>Click <strong>Add Family Member</strong>.</li>
            <li>
              Fill in the details:
              <ul className="list-disc list-inside ml-5 mt-1 space-y-0.5 text-gray-600">
                <li><strong>Relationship</strong>: Spouse or Child</li>
                <li><strong>First &amp; Last Name</strong> (required)</li>
                <li><strong>Year of Birth</strong> (optional)</li>
                <li><strong>Email</strong> (optional — recommended for spouses)</li>
                <li><strong>Phone</strong> (optional)</li>
              </ul>
            </li>
            <li>Click <strong>Add Member</strong>.</li>
          </ol>

          <p className="font-semibold mt-4">Editing a family member:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>In the <strong>Family Members</strong> list, click the <strong>pencil icon</strong> next to the member.</li>
            <li>Update the information and click <strong>Save</strong>.</li>
          </ol>

          <p className="font-semibold mt-4">Removing a family member:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>Click the <strong>trash icon</strong> next to the member you want to remove.</li>
            <li>The member will be removed immediately.</li>
          </ol>
        </section>

        {/* 7 */}
        <section className="mb-8 page-break">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            7. Contact Information
          </h2>
          <p>
            Go to <strong>Contact Info</strong> in the navigation menu to add or update your
            mailing address. This includes:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li>Street address</li>
            <li>City, State, ZIP Code</li>
            <li>Country</li>
          </ul>
          <p className="mt-2">Click <strong>Save Contact Info</strong> when done.</p>
        </section>

        {/* 8 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            8. Notification Settings
          </h2>
          <p>
            Go to <strong>Notifications</strong> in the navigation menu to control how TGROC
            communicates with you:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li><strong>Email Notifications</strong> — general updates via email</li>
            <li><strong>SMS Notifications</strong> — text message alerts</li>
            <li><strong>Newsletter</strong> — TGROC newsletter subscription</li>
            <li><strong>Event Reminders</strong> — reminders for upcoming events</li>
            <li><strong>Membership Alerts</strong> — expiry warnings and renewal notices</li>
          </ul>
          <p className="mt-2">Toggle each option on or off, then click <strong>Save Preferences</strong>.</p>
        </section>

        {/* 9 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            9. Events &amp; RSVPs
          </h2>
          <p>
            Go to <strong>Events</strong> in the navigation menu to see all upcoming and past
            TGROC events.
          </p>

          <p className="font-semibold mt-3">Submitting an RSVP:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>Click on an event to open the invitation (evite).</li>
            <li>
              Select your attendance status:
              <ul className="list-disc list-inside ml-5 mt-1 text-gray-600">
                <li><strong>Yes!</strong> — You will attend</li>
                <li><strong>Maybe</strong> — Unsure</li>
                <li><strong>Can&apos;t make it</strong> — Not attending</li>
              </ul>
            </li>
            <li>Enter your <strong>name</strong> and <strong>email</strong> (pre-filled if logged in).</li>
            <li>
              If attending, also provide:
              <ul className="list-disc list-inside ml-5 mt-1 text-gray-600">
                <li>Number of <strong>adults</strong> (15 and over) in your party</li>
                <li>Number of <strong>kids</strong> (under 15)</li>
                <li>Number of <strong>vegetarians</strong> and <strong>non-vegetarians</strong></li>
                <li>Any items you&apos;re willing to bring (if requested by organizers)</li>
              </ul>
            </li>
            <li>Add any notes and click <strong>Submit RSVP</strong>.</li>
          </ol>
          <p className="mt-3 text-gray-600">
            You can update your RSVP later by submitting the form again with the same email —
            it will replace your previous response.
          </p>
        </section>

        {/* 10 */}
        <section className="mb-8 page-break">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            10. Performance Registration
          </h2>
          <p>
            For cultural events that include performances, a <strong>Want to perform?</strong>{" "}
            button will appear on the event invitation when performance registration is open.
          </p>
          <ol className="list-decimal list-inside space-y-1 mt-2 text-gray-700">
            <li>Click <strong>Register</strong> on the performance callout card.</li>
            <li>
              Fill in your performance details:
              <ul className="list-disc list-inside ml-5 mt-1 text-gray-600">
                <li>Performance type (Singing, Dance, Skit, Poem Recital, etc.)</li>
                <li>Solo or group performance</li>
                <li>Program name, duration</li>
                <li>Coordinator contact details</li>
                <li>Microphone and other technical requirements</li>
              </ul>
            </li>
            <li>Read and agree to the terms and conditions.</li>
            <li>Click <strong>Submit Registration</strong>.</li>
          </ol>
          <p className="mt-2 text-gray-600 text-[13px]">
            Performance registration has a deadline. After the deadline has passed, the
            registration button will no longer be available.
          </p>
        </section>

        {/* 11 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            11. Membership Fees &amp; Expiry
          </h2>
          <p>
            Your membership expiry date is shown on your dashboard. If your membership is
            expiring soon, you will see a banner alerting you to renew.
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li>
              Membership renewal is handled by a TGROC officer — please contact us to
              arrange payment and renewal.
            </li>
            <li>
              You will receive email reminders at <strong>10 days, 5 days, and 1 day</strong> before
              expiry (if email notifications are enabled).
            </li>
            <li>
              After expiry, your account will be flagged as expired but you can still log in
              and view the portal.
            </li>
          </ul>
          <p className="mt-3 font-semibold">Membership types and who they cover:</p>
          <table className="mt-2 w-full text-[13px] border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-indigo-50 text-indigo-800">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Type</th>
                <th className="text-left px-3 py-2 font-semibold">Who it covers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2">Individual</td>
                <td className="px-3 py-2">The primary account holder only</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 py-2">Family</td>
                <td className="px-3 py-2">Account holder + spouse + children</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Student – Individual</td>
                <td className="px-3 py-2">Student, single</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 py-2">Student – Family</td>
                <td className="px-3 py-2">Student + spouse + children</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 12 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-1 mb-3">
            12. Need Help?
          </h2>
          <p>If you run into any issues or have questions, please reach out to us:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
            <li>Use the <strong>Contact &amp; Support</strong> form in the portal navigation</li>
            <li>Email a TGROC officer directly</li>
            <li>Approach any TGROC officer at an event</li>
          </ul>
          <p className="mt-3 text-gray-600 text-[13px]">
            Common issues include: account still pending (contact an officer to activate),
            forgotten password (use the reset link on the login page), or duplicate family
            entries (an officer can clean these up).
          </p>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>TGROC — Tamils of Greater Rochester · Member Portal User Guide · April 2026</p>
          <p className="mt-1">This document is for internal member use only.</p>
        </div>
      </div>
    </>
  );
}
