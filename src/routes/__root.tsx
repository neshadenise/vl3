import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { StudioProvider } from "@/lib/store";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10 shadow-soft">
        <div className="font-display text-7xl text-gradient">404</div>
        <h2 className="mt-4 text-xl font-display">This page slipped off the moodboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">Let's get you back to the studio.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-full bg-glow px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass rounded-3xl p-10">
        <h1 className="font-display text-2xl">A seam came undone</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-glow px-5 py-2 text-sm text-primary-foreground shadow-glow">Try again</button>
          <a href="/" className="rounded-full glass px-5 py-2 text-sm">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Virtual Lookbook — AI fashion styling & moodboards" },
      { name: "description", content: "Upload outfits, style AI fashion models, build lookbooks and moodboards in a pastel goth or dark astrology atelier." },
      { property: "og:title", content: "Virtual Lookbook — AI fashion styling & moodboards" },
      { property: "og:description", content: "Upload outfits, style AI fashion models, build lookbooks and moodboards in a pastel goth or dark astrology atelier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Virtual Lookbook — AI fashion styling & moodboards" },
      { name: "twitter:description", content: "Upload outfits, style AI fashion models, build lookbooks and moodboards in a pastel goth or dark astrology atelier." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d02262be-5f3d-4733-8943-fbb103fa6e9d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/d02262be-5f3d-4733-8943-fbb103fa6e9d" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StudioProvider>
        <Outlet />
        <Toaster />
      </StudioProvider>
    </QueryClientProvider>
  );
}
