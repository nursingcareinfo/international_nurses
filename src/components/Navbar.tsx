import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Stethoscope, Menu, X, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "./SupabaseProvider";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleApplyClick = () => {
    navigate("/");
    setTimeout(() => {
      document.getElementById("apply-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    setIsOpen(false);
  };

  const handleScrollTo = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#faf8f5]/95 backdrop-blur-md border-b border-gray-100 shadow-sm" id="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 p-2 rounded-xl text-white group-hover:bg-blue-700 transition-colors">
                <Stethoscope className="h-5 w-5" id="nav-logo-icon" />
              </div>
              <span className="font-sans font-bold text-lg text-gray-900 tracking-tight">
                Global Nurse Portal
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleScrollTo("navbar")}
              className="font-sans text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => handleScrollTo("benefits")}
              className="font-sans text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
            >
              Benefits
            </button>
            <button
              onClick={() => handleScrollTo("contact")}
              className="font-sans text-sm font-medium text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
            >
              Office Locations
            </button>

            {/* Auth Desktop Integration */}
            {user ? (
              <div className="flex items-center gap-4 border-l border-gray-100 pl-4">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      referrerPolicy="no-referrer"
                      className="h-8 w-8 rounded-full border border-gray-200"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="font-sans text-xs font-semibold text-gray-900 leading-tight">
                      {user.displayName || "Nurse Profile"}
                    </span>
                    <span className="font-sans text-[10px] text-gray-400">
                      Authenticated
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-600 font-sans text-xs font-semibold bg-gray-50 hover:bg-red-50/50 py-2 px-3 rounded-lg border border-gray-100 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="flex items-center gap-2 font-sans text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-100/50 py-2 px-4 rounded-xl cursor-pointer transition-all"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In with Google</span>
              </button>
            )}

            <button
              onClick={handleApplyClick}
              className="bg-blue-600 hover:bg-blue-700 text-white font-sans text-sm font-medium py-2.5 px-5 rounded-xl cursor-pointer transition-all hover:shadow-md"
              id="desktop-apply-btn"
            >
              Apply Now
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-blue-600 focus:outline-none p-1"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-gray-100 bg-[#faf8f5]"
          >
            <div className="px-4 pt-2 pb-4 space-y-2">
              <button
                onClick={() => handleScrollTo("navbar")}
                className="block w-full text-left font-sans text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 py-2.5 px-3 rounded-lg"
              >
                Home
              </button>
              <button
                onClick={() => handleScrollTo("benefits")}
                className="block w-full text-left font-sans text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 py-2.5 px-3 rounded-lg"
              >
                Benefits
              </button>
              <button
                onClick={() => handleScrollTo("contact")}
                className="block w-full text-left font-sans text-base font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 py-2.5 px-3 rounded-lg"
              >
                Office Locations
              </button>

              {user ? (
                <div className="border-t border-b border-gray-100 py-3 my-2 space-y-2">
                  <div className="flex items-center gap-3 px-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        referrerPolicy="no-referrer"
                        className="h-9 w-9 rounded-full border border-gray-200"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {user.displayName?.[0] || "N"}
                      </div>
                    )}
                    <div>
                      <div className="font-sans text-sm font-bold text-gray-800">
                        {user.displayName || "Nurse Candidate"}
                      </div>
                      <div className="font-sans text-xs text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 text-left font-sans text-base font-medium text-red-500 hover:bg-red-50 py-2 px-3 rounded-lg"
                  >
                    <LogOut className="h-5 w-5 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    signInWithGoogle();
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 text-left font-sans text-base font-medium text-blue-600 hover:bg-blue-50 py-2.5 px-3 rounded-lg"
                >
                  <LogIn className="h-5 w-5 text-blue-500" />
                  <span>Sign In with Google</span>
                </button>
              )}

              <div className="pt-2">
                <button
                  onClick={handleApplyClick}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-sans font-medium py-2.5 px-4 rounded-xl shadow-sm"
                  id="mobile-apply-btn"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
