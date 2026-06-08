import Image from "next/image";
import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };
    const initials = fallback
      ? fallback.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?";

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src ? (
          <Image src={src} alt={alt || "Avatar"} fill className="object-cover" sizes="48px" unoptimized />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
