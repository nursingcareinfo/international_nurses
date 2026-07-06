import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  File, 
  RotateCw, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { callEdgeFunction } from "../lib/supabase";

interface ExtractedData {
  extractedName: string;
  extractedEmail: string;
  extractedPhone: string;
  extractedLicenseNumber: string;
  extractedAddress: string;
  extractedLanguages: string;
  extractedEducation: string;
  extractedCertifications: string;
  extractedExperience: string;
  extractedSkills: string;
}

export default function Hero() {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [pncFile, setPncFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvInputRef = useRef<HTMLInputElement>(null);
  const pncInputRef = useRef<HTMLInputElement>(null);

  // Drag states for styling
  const [cvDragActive, setCvDragActive] = useState(false);
  const [pncDragActive, setPncDragActive] = useState(false);

  // Drag handlers for CV
  const handleCvDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setCvDragActive(true);
    } else if (e.type === "dragleave") {
      setCvDragActive(false);
    }
  };

  const handleCvDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCvDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCvFile(e.dataTransfer.files[0]);
    }
  };

  // Drag handlers for PNC License
  const handlePncDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setPncDragActive(true);
    } else if (e.type === "dragleave") {
      setPncDragActive(false);
    }
  };

  const handlePncDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPncDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPncFile(e.dataTransfer.files[0]);
    }
  };

  const handleCvChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handlePncChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPncFile(e.target.files[0]);
    }
  };

  const getFileIcon = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "docx" || ext === "doc") {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (ext === "pdf") {
      return <File className="h-8 w-8 text-red-500" />;
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
      return <ImageIcon className="h-8 w-8 text-green-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const handleExtractSubmit = async () => {
    if (!pncFile) {
      setError("Pakistan Nursing Council (PNC) License file is strictly mandatory.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("pnc", pncFile);
    if (cvFile) {
      formData.append("cv", cvFile);
    }

    try {
      const result = await callEdgeFunction("extract-info", formData);
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.extractedData) {
        setExtractedData(result.extractedData);
        // Persist extracted data for survey transition
        sessionStorage.setItem("extractedData", JSON.stringify(result.extractedData));
      } else {
        throw new Error("No structured data was parsed from the files. Please retry with clearer documents.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while processing your documents. Please try again with clear files.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCvFile(null);
    setPncFile(null);
    setExtractedData(null);
    setError(null);
  };

  return (
    <section className="py-16 md:py-24 bg-warm-light/50" id="apply-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Pitch Panel */}
          <div className="lg:col-span-5 space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 font-sans tracking-wide">
              Official Placement Program
            </span>
            <h1 className="font-sans text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl leading-tight">
              Apply For International Nursing Pathways
            </h1>
            <p className="font-sans text-lg text-gray-500 leading-relaxed">
              Upload your Pakistan Nursing Council (PNC) license and CV to start your international nursing application.
            </p>
            
            <div className="border-l-4 border-blue-600 pl-4 py-1 space-y-1">
              <p className="font-sans text-sm font-semibold text-gray-900">Mandatory requirement:</p>
              <p className="font-sans text-sm text-gray-500">PNC License (Image, PDF, DOCX, or Text file) is required for registration.</p>
            </div>
          </div>

          {/* Action Interactive Panel */}
          <div className="lg:col-span-7 bg-gray-50 p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?w=800&q=80&auto=format"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            
            <AnimatePresence mode="wait">
              
              {/* STATE 1: UPLOAD FORM */}
              {!extractedData && (
                <motion.div
                  key="upload-form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="font-sans text-2xl font-bold text-gray-900 tracking-tight">
                    Start Your Global Profile
                  </h2>

                  {/* PNC License Box (Mandatory) */}
                  <div className="space-y-2">
                    <label className="block font-sans text-sm font-bold text-gray-800">
                      PNC Nursing License <span className="text-red-500">*</span>
                    </label>
                    <div
                      onDragEnter={handlePncDrag}
                      onDragOver={handlePncDrag}
                      onDragLeave={handlePncDrag}
                      onDrop={handlePncDrop}
                      onClick={() => pncInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                        pncDragActive 
                          ? "border-blue-500 bg-blue-50/50" 
                          : pncFile 
                            ? "border-green-400 bg-green-50/10 hover:border-green-500" 
                            : "border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50"
                      }`}
                      id="pnc-dropzone"
                    >
                      <input
                        type="file"
                        ref={pncInputRef}
                        onChange={handlePncChange}
                        className="hidden"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                        capture="environment"
                      />
                      {pncFile ? (
                        <div className="space-y-2 text-center">
                          <div className="flex justify-center">{getFileIcon(pncFile)}</div>
                          <p className="font-sans text-sm font-semibold text-gray-800 truncate max-w-xs mx-auto">
                            {pncFile.name}
                          </p>
                          <span className="font-sans text-xs text-green-600 font-medium">
                            License uploaded successfully
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-blue-50 p-3 rounded-full text-blue-600 inline-block mb-1">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="font-sans text-sm font-bold text-gray-800">
                            Drag & drop or <span className="text-blue-600">browse</span>
                          </p>
                          <p className="font-sans text-xs text-gray-400">
                            Supported: PDF, Word Doc, Images, Text (Max 15MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CV File Box (Optional) */}
                  <div className="space-y-2">
                    <label className="block font-sans text-sm font-bold text-gray-800">
                      Professional Resume / CV <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div
                      onDragEnter={handleCvDrag}
                      onDragOver={handleCvDrag}
                      onDragLeave={handleCvDrag}
                      onDrop={handleCvDrop}
                      onClick={() => cvInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                        cvDragActive 
                          ? "border-blue-500 bg-blue-50/50" 
                          : cvFile 
                            ? "border-green-400 bg-green-50/10 hover:border-green-500" 
                            : "border-gray-200 bg-white hover:border-blue-400 hover:bg-gray-50/50"
                      }`}
                      id="cv-dropzone"
                    >
                      <input
                        type="file"
                        ref={cvInputRef}
                        onChange={handleCvChange}
                        className="hidden"
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt"
                      />
                      {cvFile ? (
                        <div className="space-y-2 text-center">
                          <div className="flex justify-center">{getFileIcon(cvFile)}</div>
                          <p className="font-sans text-sm font-semibold text-gray-800 truncate max-w-xs mx-auto">
                            {cvFile.name}
                          </p>
                          <span className="font-sans text-xs text-green-600 font-medium">
                            Resume uploaded successfully
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="bg-gray-50 p-3 rounded-full text-gray-500 inline-block mb-1">
                            <Upload className="h-6 w-6" />
                          </div>
                          <p className="font-sans text-sm font-bold text-gray-800">
                            Drag & drop or <span className="text-blue-600">browse</span>
                          </p>
                          <p className="font-sans text-xs text-gray-400">
                            Supported: PDF, Word Doc, Images, Text (Max 15MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 items-start"
                      id="error-banner"
                    >
                      <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-sans font-bold text-sm text-red-800">Submission Error</h4>
                        <p className="font-sans text-xs text-red-700 mt-1">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleExtractSubmit}
                    disabled={loading || !pncFile}
                    className={`w-full py-3.5 px-6 rounded-2xl font-sans font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                      loading || !pncFile
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-98"
                    }`}
                    id="submit-extraction-btn"
                  >
                    {loading ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        <span>Processing your documents...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Application</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* STATE 2: WELCOME SUMMARY & NEXT STEP */}
              {extractedData && (
                <motion.div
                  key="success-summary"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Title Banner */}
                  <div className="flex gap-4 items-start">
                    <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="font-sans text-xs font-bold text-green-600 tracking-wider uppercase">
                        Documents Received
                      </span>
                      <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight mt-1" id="welcome-heading">
                        Welcome, {extractedData.extractedName || "Candidate Nurse"}!
                      </h2>
                    </div>
                  </div>

                  <p className="font-sans text-sm text-gray-500 leading-relaxed">
                    Your documents have been received. Click the button below to complete the placement survey.
                  </p>

                  {/* Extracted data summary hidden per user request */}

                  {/* Navigation Button */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleReset}
                      className="flex-1 py-3 px-5 rounded-xl border border-gray-200 text-gray-600 bg-white font-sans text-sm font-semibold hover:bg-gray-50 cursor-pointer text-center"
                    >
                      Upload Different Files
                    </button>
                    
                    <Link
                      to="/survey"
                      state={{ extractedData }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-sans text-sm font-bold py-3 px-5 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 hover:shadow-lg active:scale-98"
                      id="continue-survey-btn"
                    >
                      <span>Continue to Survey</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>
    </section>
  );
}
