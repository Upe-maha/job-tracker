// src/app/page.tsx

export default function RootPage() {
  // The proxy.ts middleware handles the actual redirects for this route.
  return (
    <>
      <h1>Welcome to the Job Tracker App</h1>
      <p>
        This is the root page. You will be redirected to the appropriate page based on your authentication status.
      </p>
      <p>
        If you are logged in, you will be redirected to the dashboard. If not, you will be redirected to the login page.
      </p>
      <p>
        type <a href="/login" className="text-blue-500 underline">
          /login
        </a> in url to get login page and type 
        <a href="/register" className="text-blue-500 underline">
          /register
        </a> in url to get register page.
      </p>
    </>
  )

}