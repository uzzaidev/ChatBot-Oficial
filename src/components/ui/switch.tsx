"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // Estado desligado: fundo escuro com borda visível
      "data-[state=unchecked]:bg-[#2a2f3a] data-[state=unchecked]:border-white/20",
      // Estado ligado: fundo mint com borda mais forte
      "data-[state=checked]:bg-[#1ABC9C] data-[state=checked]:border-[#1ABC9C] data-[state=checked]:shadow-lg data-[state=checked]:shadow-[#1ABC9C]/30",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-6 w-6 rounded-full transition-all duration-200",
        // Sombra e borda mais definidas
        "bg-white shadow-xl ring-2 ring-white/20",
        // Transformação com mais espaço (w-12 - h-6 - 2px de padding)
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        // Sombra extra quando ativado
        "data-[state=checked]:shadow-2xl data-[state=checked]:ring-[#1ABC9C]/30"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
