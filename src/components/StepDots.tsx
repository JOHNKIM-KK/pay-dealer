export function StepDots({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="mb-6 flex justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all ${
            index === step ? 'w-5 bg-[#3182F6]' : 'w-1.5 bg-[#D1D6DB]'
          }`}
        />
      ))}
    </div>
  )
}
