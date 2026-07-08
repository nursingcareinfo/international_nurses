import { Stethoscope, MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300 py-16 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="bg-blue-600 p-2 rounded-xl">
                <Stethoscope className="h-5 w-5" />
              </div>
              <span className="font-sans font-bold text-lg tracking-tight">
                Global Nurse Portal
              </span>
            </div>
            <p className="font-sans text-sm text-gray-400 leading-relaxed">
              Empowering professional Pakistani healthcare specialists with high-income global career pathways.
            </p>
          </div>

          {/* London Office */}
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-sm text-white tracking-wider uppercase">
              London Office
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <span>88 Kingsway, Holborn, London WC2B 6AA, United Kingdom</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                <span>+44 20 7946 0958</span>
              </li>
            </ul>
          </div>

          {/* Dubai Office */}
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-sm text-white tracking-wider uppercase">
              Dubai Office
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <span>Building 4, Dubai Healthcare City, Dubai, UAE</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                <span>+971 4 324 5555</span>
              </li>
            </ul>
          </div>

          {/* Singapore Office */}
          <div className="space-y-4">
            <h4 className="font-sans font-bold text-sm text-white tracking-wider uppercase">
              Singapore Office
            </h4>
            <ul className="space-y-2.5 font-sans text-sm text-gray-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <span>79 Anson Road, Singapore 079906</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                <span>careers@globalnurseportal.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400">
          <p className="font-sans">
            &copy; {new Date().getFullYear()} Global Nurse Recruitment Portal. All rights reserved.
          </p>
          <div className="flex gap-6 font-sans">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gray-300 transition-colors">PNC Compliance</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
