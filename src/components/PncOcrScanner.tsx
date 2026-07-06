import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { 
  ShieldAlert, 
  Upload, 
  RotateCw, 
  CheckCircle, 
  ScanLine, 
  Sparkles, 
  Calendar, 
  FileKey,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { callEdgeFunction } from "../lib/supabase";

interface PncOcrScannerProps {
  onUpdateFields: (fields: { licenseNumber?: string; expiryDate?: string }) => void;
  currentLicenseNumber?: string;
  currentExpiryDate?: string;
}

export default function PncOcrScanner({ 
  onUpdateFields, 
  currentLicenseNumber, 
  currentExpiryDate 
}: PncOcrScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ licenseNumber: string; expiryDate: string } | null>(null);
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please upload an image file of your PNC registration card (PNG, JPG, or WEBP).");
      return;
    }
    setError(null);
    setFile(selectedFile);
    setResults(null);
    setApplied(false);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleStartScan = async () => {
    if (!file) return;

    setScanning(true);
    setError(null);
    setApplied(false);

    try {
      const formData = new FormData();
      formData.append("pncCard", file);

      const res = await callEdgeFunction("ocr-pnc", formData);

      if (res && (res.licenseNumber || res.expiryDate)) {
        setResults({
          licenseNumber: res.licenseNumber || "",
          expiryDate: res.expiryDate || "",
        });
      } else if (res && res.error) {
        throw new Error(res.error);
      } else {
        throw new Error("Could not read card details. Please make sure the PNC Card is clearly visible, bright, and not blurry.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during card parsing. Please double check file quality and try again.");
    } finally {
      setScanning(false);
    }
  };

  const handleApply = () => {
    if (!results) return;
    onUpdateFields({
      licenseNumber: results.licenseNumber,
      expiryDate: results.expiryDate,
    });
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
    }, 4000);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    setApplied(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden mt-2 mb-6">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-base">PNC Smart Card Scanner</h3>
            <p className="font-sans text-xs text-blue-100 mt-0.5">Upload your PNC card to auto-fill license details</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-sm text-gray-500 leading-relaxed">
                Have an image of your physical <strong>Pakistan Nursing Council (PNC)</strong> registration card? Drag or upload it below to scan your license number and expiry date.
              </div>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                  dragActive 
                    ? "border-blue-500 bg-blue-50/50" 
                    : "border-gray-200 bg-gray-50/50 hover:border-blue-400 hover:bg-white"
                }`}
                id="ocr-dropzone"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  capture="environment"
                />
                <div className="bg-blue-50 p-3 rounded-full text-blue-600 mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="font-sans text-sm font-bold text-gray-800">
                  Upload or Drop PNC Card Image
                </p>
                <p className="font-sans text-xs text-gray-400 mt-1">
                  Supports PNG, JPG, JPEG, WEBP (Max 10MB)
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Image Preview and Scanning Area */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="col-span-1 md:col-span-5 flex flex-col items-center">
                  <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-black max-h-[180px] w-full flex items-center justify-center shadow-inner">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="PNC Card Preview" 
                        className={`object-contain max-h-[180px] transition-all duration-300 ${scanning ? "opacity-60" : ""}`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {/* Laser Scan animation */}
                    {scanning && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#06b6d4,0_0_20px_#06b6d4] animate-[bounce_2s_infinite]" />
                    )}

                    {scanning && (
                      <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                        <div className="bg-gray-900/85 text-white px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 shadow-md">
                          <RotateCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                          <span>PARSING CARD TEXT...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={scanning}
                    className="text-xs text-red-500 font-semibold hover:underline mt-2.5 disabled:opacity-50"
                  >
                    Remove and upload a different image
                  </button>
                </div>

                <div className="col-span-1 md:col-span-7 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-mono font-medium truncate max-w-[200px]">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  {!results && !scanning && (
                    <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                      <h4 className="font-sans font-bold text-sm text-blue-900 flex items-center gap-1.5">
                        <ScanLine className="h-4 w-4" />
                        Ready to scan card
                      </h4>
                      <p className="font-sans text-xs text-blue-700/80 mt-1 leading-relaxed">
                        Upload an image of your Pakistan Nursing Council Registration Card to read your license number and expiry date.
                      </p>
                      
                      <button
                        type="button"
                        onClick={handleStartScan}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <ScanLine className="h-4 w-4" />
                        <span>Scan Card Details</span>
                      </button>
                    </div>
                  )}

                  {scanning && (
                    <div className="border border-blue-100 bg-blue-50/10 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                        <RotateCw className="h-4 w-4 animate-spin text-blue-600" />
                        <span>Scanning card...</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-600 h-1.5 rounded-full animate-[shimmer_1.5s_infinite]" style={{ width: "80%" }}></div>
                      </div>
                      <p className="font-sans text-xs text-gray-400 italic mt-1">
                        Reading card image for license number and expiry date.
                      </p>
                    </div>
                  )}

                  {results && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-green-100 bg-green-50/30 rounded-xl p-4 space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-green-800 font-bold text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Card Scanned Successfully!</span>
                        </div>
                        {applied && (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            Applied!
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <div className="bg-white border border-green-100 rounded-lg p-2.5 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <FileKey className="h-3 w-3 text-blue-500" />
                            <span>License Number</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-blue-700 mt-1 truncate">
                            {results.licenseNumber || <span className="text-gray-300 italic font-sans font-normal text-xs">Not found</span>}
                          </div>
                        </div>

                        <div className="bg-white border border-green-100 rounded-lg p-2.5 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            <Calendar className="h-3 w-3 text-emerald-500" />
                            <span>Expiry Date</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-emerald-700 mt-1 truncate">
                            {results.expiryDate || <span className="text-gray-300 italic font-sans font-normal text-xs">Not found</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleApply}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Auto-fill into Survey Form</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 flex items-start gap-2.5">
                      <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold">Scanning failed</p>
                        <p className="mt-1 leading-relaxed text-red-700/95">{error}</p>
                        <button
                          type="button"
                          onClick={handleStartScan}
                          className="mt-2 text-blue-600 font-bold hover:underline"
                        >
                          Retry Scan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
