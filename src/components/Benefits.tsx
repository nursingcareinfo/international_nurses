import { Globe, DollarSign, TrendingUp, HeartHandshake } from "lucide-react";
import { motion } from "motion/react";

const IMAGES = {
  plane: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop&auto=format",
  nurse: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=300&fit=crop&auto=format",
  passport: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&auto=format",
  flags: "https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?w=400&h=300&fit=crop&auto=format",
};

const BENEFITS_DATA = [
  {
    icon: Globe,
    title: "Global Opportunities",
    description: "Get direct access to fast-track nursing jobs in the UK, Middle East, and across Europe.",
    color: "text-blue-600 bg-blue-50",
    image: IMAGES.plane,
  },
  {
    icon: DollarSign,
    title: "Competitive Salaries",
    description: "Earn world-class wages, generous shift premiums, pension plans, and relocation allowances.",
    color: "text-green-600 bg-green-50",
    image: IMAGES.flags,
  },
  {
    icon: TrendingUp,
    title: "Professional Growth",
    description: "Work in advanced, internationally accredited hospitals with premium modern technology.",
    color: "text-purple-600 bg-purple-50",
    image: IMAGES.nurse,
  },
  {
    icon: HeartHandshake,
    title: "Comprehensive Support",
    description: "We handle your visa sponsorship, housing setup, PNC verification help, and flight details.",
    color: "text-orange-600 bg-orange-50",
    image: IMAGES.passport,
  }
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 bg-warm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Why Apply For International Nursing Roles?
          </h2>
          <p className="mt-4 font-sans text-lg text-gray-600 text-center">
            Broaden your career horizons, support your family back in Pakistan, and make a massive global clinical impact.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {BENEFITS_DATA.map((benefit, index) => {
            const IconComponent = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#faf8f5] p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
                id={`benefit-card-${index}`}
              >
                <div className={`p-4 rounded-xl inline-block ${benefit.color} mb-6 transition-transform group-hover:scale-110`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="font-sans text-xl font-bold text-gray-900 tracking-tight mb-3">
                  {benefit.title}
                </h3>
                <p className="font-sans text-base text-gray-600 leading-relaxed mb-6">
                  {benefit.description}
                </p>
                <div className="relative h-32 -mx-8 -mb-8 overflow-hidden rounded-b-2xl">
                  <img
                    src={benefit.image}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
