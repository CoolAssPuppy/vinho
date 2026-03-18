import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.jpg"
          alt="Wine glass raised against alpine vineyard landscape"
          fill
          className="object-cover object-bottom"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      </div>

      {/* Content -- left-aligned to avoid the wine glass */}
      <div className="relative z-10 flex min-h-screen items-center px-8 sm:px-16 lg:px-24">
        <div className="max-w-xl">
          <h1 className="text-7xl font-bold tracking-tight text-white sm:text-8xl lg:text-9xl">
            Vinho
          </h1>

          <p className="mt-4 whitespace-nowrap text-lg font-light text-white/80 sm:text-xl">
            Learn wine through terroir, history, and taste.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-white px-8 py-6 text-sm font-semibold text-black transition-all hover:bg-white/90"
              >
                Get started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="ghost"
                className="px-8 py-6 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
              >
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
