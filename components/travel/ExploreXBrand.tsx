export function ExploreXBrand({
  size = "default",
}: {
  size?: "default" | "large";
}) {
  const large = size === "large";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 40 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`${large ? "size-10" : "size-8"} shrink-0 text-teal-400 transition group-hover:text-emerald-300`}
      >
        <path
          d="M4 28L15 8L24 22L29 14L37 28H4Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 8L20 2M29 14L32 10"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="flex flex-col">
        <span
          className={`${large ? "text-xl" : "text-lg"} font-heading font-extrabold tracking-[0.22em] text-white`}
        >
          EXPLOREX
        </span>
        <span className="text-[8.5px] font-semibold uppercase tracking-[0.25em] text-slate-400">
          Explore. Dream. Discover.
        </span>
      </span>
    </span>
  );
}
