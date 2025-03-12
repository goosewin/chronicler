"use client";

import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
