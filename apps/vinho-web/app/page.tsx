import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Wine } from "lucide-react"

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
        <h1 className="mb-4 text-5xl font-bold text-white md:text-6xl">
          Vinho
        </h1>

        {/* Tagline */}
        <p className="mb-12 max-w-md text-center text-lg text-white/90 md:text-xl">
          Learn wine through terroir, history, and taste
        </p>

        {/* Auth Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link href="/auth/login">
            <Button size="lg" variant="secondary" className="min-w-[140px]">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" className="min-w-[140px]">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}