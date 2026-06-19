export function StatusBar({ time = "21:30" }: { time?: string }) {
  return (
    <div className="flex justify-between items-center pt-4 px-6 font-display font-bold text-[13px] text-text">
      <span>{time}</span>
      <span className="flex gap-1.5 items-center opacity-80">
        <span className="w-[17px] h-3 border-[1.5px] border-text rounded-[2px] inline-block" />
        <span className="w-[3px] h-3 bg-text rounded-[1px] inline-block" />
      </span>
    </div>
  );
}
