const LETTERS = ["P", "U", "Z", "Z", "L", "I", "N", "G", ".", "U", "S"];

export function Wordmark() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex border-[2.5px] border-ink bg-white">
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            className="w-8 sm:w-10 aspect-square flex items-center justify-center border-r-[1.5px] border-ink last:border-r-0 font-hand font-bold text-pen-blue text-2xl sm:text-3xl"
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
