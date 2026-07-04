import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { FileText, Shield, MapPin, Sparkles, CheckCircle2, Clock, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "./FirebaseProvider";
import { motion, AnimatePresence } from "motion/react";

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  createdAt: string;
  surveyData?: any;
  extractedData?: any;
}

export default function ApplicationsTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setApplications([]);
      return;
    }

    const fetchUserApplications = async () => {
      setLoading(true);
      try {
        const appCol = collection(db, "applications");
        const q = query(
          appCol,
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const appsList: Application[] = [];
        querySnapshot.forEach((doc) => {
          appsList.push({ id: doc.id, ...doc.data() } as Application);
        });
        
        // Sort by createdAt client-side to ensure ordering without needing composite index setups immediately
        appsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setApplications(appsList);
      } catch (err) {
        console.error("Error fetching user applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserApplications();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-50/50 border-t border-b border-gray-100 py-16" id="applications-tracker">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 font-sans tracking-wide uppercase mb-3">
            Real-Time Application Tracking
          </span>
          <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            My Registered Applications
          </h2>
          <p className="font-sans text-base text-gray-500 mt-2">
            Securely track your credentials verification status, parsed CV elements, and overseas target matches.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-sans text-sm text-gray-500">Retrieving secure profiles...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white border border-gray-100 p-8 rounded-2xl text-center shadow-sm max-w-xl mx-auto space-y-4">
            <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-gray-900">No Applications Found</h3>
              <p className="font-sans text-sm text-gray-500 mt-1">
                You haven't completed any submissions under <strong>{user.email}</strong>. Use the uploader above to begin your application!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {applications.map((app, index) => {
              const isExpanded = expandedAppId === app.id;
              const formattedDate = new Date(app.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <div 
                  key={app.id}
                  className="bg-white rounded-2xl border border-gray-150/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  {/* Card Header Accordion Trigger */}
                  <div 
                    onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                    className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-sans font-bold text-gray-900 text-lg">
                            {app.fullName}
                          </h3>
                          <span className="font-mono text-xs bg-blue-50 text-blue-700 py-0.5 px-2 rounded-md font-semibold">
                            ID: {app.id.substring(0, 8)}...
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {formattedDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5 text-green-500" /> PNC: {app.licenseNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="font-sans text-xs font-bold text-amber-700 uppercase tracking-wider">
                          In Verification
                        </span>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Content Details */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-gray-100 bg-gray-50/30"
                      >
                        <div className="p-6 md:p-8 space-y-6 text-left text-sm font-sans">
                          
                          {/* Inner details grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Left Col: Contact */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                              <h4 className="font-bold text-xs text-gray-400 tracking-wider uppercase">
                                Verified Contact
                              </h4>
                              <div className="space-y-2">
                                <p className="text-gray-700 font-medium">
                                  Email: <span className="text-gray-900 block font-bold">{app.email}</span>
                                </p>
                                <p className="text-gray-700 font-medium">
                                  Phone: <span className="text-gray-900 block font-bold">{app.phone}</span>
                                </p>
                              </div>
                            </div>

                            {/* Middle Col: Placement Preferences */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                              <h4 className="font-bold text-xs text-gray-400 tracking-wider uppercase">
                                Placement Targets
                              </h4>
                              {app.surveyData ? (
                                <div className="space-y-1.5">
                                  <p className="text-gray-700 font-medium flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                                    1. {app.surveyData.preferredCountry1 || "United Kingdom"}
                                  </p>
                                  <p className="text-gray-700 font-medium flex items-center gap-1 pl-4.5">
                                    2. {app.surveyData.preferredCountry2 || "Saudi Arabia"}
                                  </p>
                                  <p className="text-gray-700 font-medium flex items-center gap-1 pl-4.5">
                                    3. {app.surveyData.preferredCountry3 || "UAE"}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-gray-400 italic">No survey data recorded.</p>
                              )}
                            </div>

                            {/* Right Col: Timeline/Status tracker */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 space-y-3">
                              <h4 className="font-bold text-xs text-gray-400 tracking-wider uppercase">
                                Workflow Progress
                              </h4>
                              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                                <div className="flex gap-2 items-center pl-1">
                                  <CheckCircle2 className="h-4.5 w-4.5 text-green-500 shrink-0 z-10 bg-white rounded-full" />
                                  <span className="text-xs font-semibold text-gray-900">
                                    PNC Scanned & Saved
                                  </span>
                                </div>
                                <div className="flex gap-2 items-center pl-1">
                                  <CheckCircle2 className="h-4.5 w-4.5 text-green-500 shrink-0 z-10 bg-white rounded-full" />
                                  <span className="text-xs font-semibold text-gray-900">
                                    Profile Questionnaire Complete
                                  </span>
                                </div>
                                <div className="flex gap-2 items-center pl-1">
                                  <div className="h-4.5 w-4.5 rounded-full border-2 border-amber-500 flex items-center justify-center shrink-0 z-10 bg-white">
                                    <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                                  </div>
                                  <span className="text-xs font-bold text-amber-700">
                                    Recruiter Verification Pending
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* AI extracted snapshot section */}
                          {app.extractedData && (
                            <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-3">
                              <h4 className="font-bold text-xs text-blue-600 tracking-wider uppercase">
                                AI Extracted Credentials Snapshot
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="text-gray-400">Extracted Name</span>
                                  <p className="font-semibold text-gray-800">{app.extractedData.extractedName || "N/A"}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Extracted Experience</span>
                                  <p className="font-semibold text-gray-800 truncate">{app.extractedData.extractedExperience || "N/A"}</p>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                  <span className="text-gray-400">Extracted Clinical Skills</span>
                                  <p className="font-semibold text-gray-800">{app.extractedData.extractedSkills || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
