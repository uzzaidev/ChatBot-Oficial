"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    {/* Track - Barra de fundo com melhor contraste */}
    <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-[#2a2f3a] border border-white/10">
      {/* Range - Parte preenchida com cor mint */}
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#1ABC9C] to-[#16a085] rounded-full" />
    </SliderPrimitive.Track>
    {/* Thumb - Bolinha maior e mais visível */}
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-[3px] border-[#1ABC9C] bg-white shadow-2xl ring-2 ring-[#1ABC9C]/30 transition-all duration-200 hover:scale-110 hover:ring-[#1ABC9C]/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1ABC9C]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1419] disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
