import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  return (
    <>
      {/* Desktop background - only visible outside the phone shell on larger screens */}
      <div className="mobile-shell-bg hidden md:block" />

      <div className="mobile-shell">
        {!hideNav && <TopBar />}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </>
  );
}
