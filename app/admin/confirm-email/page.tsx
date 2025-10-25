export default function ConfirmEmail() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-10 w-10 text-blue-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="mb-3 text-3xl font-bold">Check Your Email</h1>
          
          <p className="mb-6 text-gray-600">
            We&apos;ve sent you a confirmation email. Please check your inbox and click the 
            confirmation link to activate your account.
          </p>

          <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">📧 What to do next:</p>
            <ol className="text-left space-y-1 ml-4 list-decimal">
              <li>Open your email inbox</li>
              <li>Find the confirmation email from us</li>
              <li>Click the confirmation link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Didn&apos;t receive the email? Check your spam folder or try signing up again.
          </p>

          <a
            href="/admin/login"
            className="inline-block w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Go to Login
          </a>

          <p className="mt-4 text-sm text-gray-600">
            Already confirmed?{' '}
            <a href="/admin/login" className="font-medium text-blue-600 hover:underline">
              Sign in now
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

