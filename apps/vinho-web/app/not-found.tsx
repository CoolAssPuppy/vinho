import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/404.jpg"
          alt="404 background"
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
      </div>

      {/* Content - positioned in upper left */}
      <div className="relative z-10 flex min-h-screen">
        <div className="flex flex-col justify-start items-start px-8 pt-24 md:px-16 md:pt-32 lg:px-24 lg:pt-40">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            Whoopsie!
          </h1>

          <p className="text-xl md:text-2xl lg:text-3xl text-white/90 mb-8 max-w-md">
            I don&apos;t know what you&apos;re talking about.
          </p>

          <Link href="/">
            <Button
              size="lg"
              className="bg-black hover:bg-black/90 text-white border-0"
            >
              Head back to the homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
