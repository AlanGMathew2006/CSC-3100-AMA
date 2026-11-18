import { BrandHeader } from "./BrandHeader";

// The branded empty page shown while the session or profile is loading.
export function LoadingShell() {
  return (
    <div className="page-shell">
      <BrandHeader />
    </div>
  );
}
