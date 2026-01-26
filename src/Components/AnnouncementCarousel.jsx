import { cn } from "@/Common/Utils";
import { useEffect, useState } from "react";

export default function AnnouncementCarousel({
  items,
  interval = 5000,
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!items?.length) return;

    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(timer);
  }, [items, interval]);

  if (!items?.length) return null;

  return (
    <div className="w-full md:w-[95%] mx-auto">
      <div className="relative rounded-xl overflow-hidden border">
        {/* ================= IMAGE SLIDE ================= */}
        <div className="relative h-[clamp(250px,40vw,400px)]">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                idx === active ? "opacity-100" : "opacity-0"
              )}
            >
              {/* IMAGE */}
              <img
                src={item.image}
                className="w-full h-full"
              />

              {/* DARK GRADIENT OVERLAY */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {/* TEXT OVER IMAGE */}
              {idx === active && (
                item?.maintenance? 
                <>
                  <div className="absolute top-0 left-0 right-0 px-4 pt-4 md:px-6 md:pt-6">
                    <h3 className="font-semibold title-banner text-white">
                      Maintenance
                    </h3>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 md:px-6 md:pb-6">
                    <p className="text-gray-200 text-lg mt-1 line-clamp-2">
                      {item.description}
                    </p>

                    {/* ACTION BAR */}
                    <div className="flex max-sm:flex-wrap max-sm:gap-2 items-center justify-between mt-1">
                      {/* INDICATOR */}
                      <div className="flex gap-2">
                        {items.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActive(i)}
                            className={cn(
                              "h-1.5 rounded-full transition-all",
                              i === active
                                ? "w-6 bg-white"
                                : "w-3 bg-white/50"
                            )}
                          />
                        ))}
                      </div>

                      {/* SEE DETAIL */}
                      {item.onClick && (
                        <button
                          onClick={item.onClick}
                          className="
                            text-xs font-medium text-gray-900
                            px-4 py-1.5 rounded-md
                            bg-white/80 hover:bg-white
                            transition
                          "
                        >
                          Lihat Detail
                        </button>
                      )}
                    </div>
                  </div>
                </>:
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 md:px-6 md:pb-6">
                  <p className="text-gray-200 text-lg mt-1 line-clamp-2">
                    {item.description}
                  </p>

                  {/* ACTION BAR */}
                  <div className="flex max-sm:flex-wrap max-sm:gap-2 items-center justify-between mt-1">
                    {/* INDICATOR */}
                    <div className="flex gap-2">
                      {items.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActive(i)}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            i === active
                              ? "w-6 bg-white"
                              : "w-3 bg-white/50"
                          )}
                        />
                      ))}
                    </div>

                    {/* SEE DETAIL */}
                    {item.onClick && (
                      <button
                        onClick={item.onClick}
                        className="
                          text-xs font-medium text-gray-900
                          px-4 py-1.5 rounded-md
                          bg-white/80 hover:bg-white
                          transition
                        "
                      >
                        Lihat Detail
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
