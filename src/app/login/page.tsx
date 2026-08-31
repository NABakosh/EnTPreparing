import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center">
          <p className="text-neutral-500">Загрузка...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
