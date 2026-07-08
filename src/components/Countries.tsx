const COUNTRIES = [
  { flag: "🇬🇧", name: "UK" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇸🇦", name: "Saudi Arabia" },
  { flag: "🇶🇦", name: "Qatar" },
  { flag: "🇰🇼", name: "Kuwait" },
  { flag: "🇴🇲", name: "Oman" },
  { flag: "🇧🇭", name: "Bahrain" },
  { flag: "🇺🇸", name: "USA" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇮🇪", name: "Ireland" },
  { flag: "🇩🇪", name: "Germany" },
];

export default function Countries() {
  return (
    <section className="py-16 bg-warm relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&auto=format"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl mb-4">
          Jobs in 10+ Countries
        </h2>
        <p className="font-sans text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          We connect Pakistani nurses with healthcare employers across the globe.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {COUNTRIES.map((c) => (
            <div
              key={c.name}
              className="bg-[#faf8f5] border border-gray-100 rounded-2xl px-5 py-3 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-gray-200 transition-all"
            >
              <span className="text-2xl leading-none">{c.flag}</span>
              <span className="font-sans text-sm font-semibold text-gray-800">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
