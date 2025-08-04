"use client";
import { useRive } from "@rive-app/react-canvas";
import BookMe from "../BookMe";

export default function LandingVehicle() {
  const { RiveComponent: Animation } = useRive({
    src: "/rive/black_left.riv",
    stateMachines: "State Machine 1",
    autoplay: true,
  });

  return (
    <div className="fixed inset-0 flex">
      {/* Left side animation - hidden on mobile, 40% width */}
      <div className="hidden md:flex w-2/5 h-screen justify-center items-end">
        <Animation style={{ width: "80%", height: "80%" }} />
      </div>
      
      {/* Right side content - full width on mobile, 60% on desktop */}
      <div className="w-full md:w-3/5 h-full">
        <BookMe />
      </div>
    </div>
  );
}
