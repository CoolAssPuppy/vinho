import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Wine } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.jpg"
          alt="Wine vineyard"
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Wine className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="mb-6 text-7xl font-bold text-white md:text-8xl lg:text-9xl tracking-tight">
          Vinho
        </h1>

        {/* Tagline */}
        <p className="mb-12 max-w-lg text-center text-2xl font-light text-white md:text-3xl lg:text-4xl">
          Learn wine through terroir, history, and taste
        </p>

        {/* Auth Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/auth/login">
            <Button
              size="lg"
              variant="default"
              className="min-w-[140px] bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-md font-semibold"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button
              size="lg"
              variant="default"
              className="min-w-[140px] bg-primary hover:bg-primary/90 text-white border-0 font-semibold"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
