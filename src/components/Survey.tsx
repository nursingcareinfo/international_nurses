import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  User, 
  ShieldCheck, 
  Briefcase, 
  Globe, 
  Heart, 
  HelpCircle, 
  FileCheck, 
  Home 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { callEdgeFunction, supabase } from "../lib/supabase";
import PncOcrScanner from "./PncOcrScanner";


export default function Survey() {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve extracted data from location state or sessionStorage
  const [extractedData, setExtractedData] = useState<any>(null);

  useEffect(() => {
    let data = location.state?.extractedData;
    if (!data) {
      const stored = sessionStorage.getItem("extractedData");
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (_) {}
      }
    }
    if (data) {
      setExtractedData(data);
    }
  }, [location.state]);

  const extractedName = extractedData?.extractedName || "Candidate Nurse";

  // Active step of the survey
  const [activeTab, setActiveTab] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    // Section 1: Personal Information
    fullName: "",
    email: "",
    phone: "",
    address: "",
    dob: "1995-01-01",
    age: "31",
    gender: "Female",
    nationality: "Pakistani",
    domicile: "Punjab",
    religion: "Islam",
    maritalStatus: "Single",
    nextOfKin: "",
    nextOfKinRelation: "Parent",
    nextOfKinPhone: "",

    // Section 2: PNC Credentials
    licenseNumber: "",
    councilName: "Pakistan Nursing Council",
    category: "Registered Nurse (RN)",
    issueDate: "2020-05-15",
    expiryDate: "2028-05-15",
    verificationStatus: "Active",
    additionalQualifications: "General Nursing and Midwifery",
    nursingSchool: "",
    graduationYear: "2019",
    pncCardPresent: "Yes",

    // Section 3: Employment & Income
    currentEmployer: "",
    jobTitle: "Staff Nurse",
    department: "ICU / CCU",
    experienceYears: "5",
    monthlyIncome: "120,000 PKR",
    incomeSource: "Govt Hospital Salary",
    currentEmploymentStatus: "Full-Time",
    hasPrivatePractice: "No",
    totalOverseasExperience: "0",
    workShiftType: "Rotational",

    // Section 4: Availability
    readyToRelocate: "Yes",
    preferredCountry1: "United Kingdom",
    preferredCountry2: "Saudi Arabia",
    preferredCountry3: "United Arab Emirates",
    earliestStartDate: "Within 3 Months",
    requiresVisaSponsorship: "Yes",
    travelingWithFamily: "No",
    languageProficiency: "Urdu (Native), English (Professional)",
    preferredHospitalType: "Public (NHS/Govt)",

    // Section 5: Safety & Wellbeing
    safetyConcerns: "No",
    harassmentExperience: "No",
    workplaceSafetyRating: "Good (4/5)",
    supportGroupNeeds: "Yes",
    wellnessProgramsInterest: "Yes",
    peerMentorshipInterest: "Yes",
    culturalTrainingNeed: "Yes",

    // Section 6: App Viability
    passportValidity: "Yes (More than 2 years)",
    ieltsOetScore: "Not taken yet",
    ieltsExamDate: "",
    motivatorsForWorkingAbroad: "Higher income & supporting family back home",
    financialSavingsTarget: "60-80%",
    expectedRelocationAllowance: "Yes",
    hasPendingVisaRefusals: "No",

    // Section 7: Final Remarks
    additionalInfo: "",
    referralSource: "Social Media",
    consentChecked: false,
  });

  // Pre-populate fields with AI extracted data once available
  useEffect(() => {
    if (extractedData) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || extractedData.extractedName || "",
        email: prev.email || extractedData.extractedEmail || "",
        phone: prev.phone || extractedData.extractedPhone || "",
        address: prev.address || extractedData.extractedAddress || "",
        licenseNumber: prev.licenseNumber || extractedData.extractedLicenseNumber || "",
        additionalQualifications: extractedData.extractedEducation || prev.additionalQualifications || "",
      }));
    }
  }, [extractedData]);

  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate age if DOB changes
      if (field === "dob" && typeof value === "string") {
        try {
          const birthYear = new Date(value).getFullYear();
          const currentYear = new Date().getFullYear();
          updated.age = String(currentYear - birthYear);
        } catch (_) {}
      }

      return updated;
    });
  };

  const handleNext = () => {
    if (activeTab < 4) {
      setActiveTab(activeTab + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.consentChecked) {
      setError("Please check the consent checkbox to authorize processing your credentials.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        extractedData: extractedData || {},
        surveyData: formData,
      };

      await callEdgeFunction("submit-complete", payload);
      setSubmitted(true);
      sessionStorage.removeItem("extractedData");
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message || "An error occurred during submission. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const SECTIONS = [
    { label: "Career & Salary", icon: Briefcase },
    { label: "Availability", icon: Globe },
    { label: "Safety / Wellbeing", icon: Heart },
    { label: "App Viability", icon: HelpCircle },
    { label: "Final Remarks", icon: FileCheck },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      
      {/* Dynamic Header */}
      <div className="bg-blue-600 text-white py-12 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight">
              Placement Survey & Verification
            </h1>
            <p className="font-sans text-blue-100 mt-2 text-sm md:text-base">
              Welcome, <span className="font-bold text-white underline">{extractedName}</span>! Please complete the questionnaire to complete your profile.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Upload</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        
        <AnimatePresence mode="wait">
          
          {/* STATE 1: SURVEY NOT SUBMITTED */}
          {!submitted ? (
            <motion.div
              key="survey-main"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              
              {/* Sidebar Tabs */}
              <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-1.5">
                <span className="block font-sans text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 mb-2">
                  Survey Sections
                </span>
                
                {SECTIONS.map((sec, idx) => {
                  const Icon = sec.icon;
                  const isActive = idx === activeTab;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl font-sans text-sm font-medium transition-colors cursor-pointer text-left ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      id={`tab-${idx}`}
                    >
                      <Icon className={`h-4.5 w-4.5 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Central Survey Panel */}
              <div className="lg:col-span-9 bg-white border border-gray-100 rounded-3xl shadow-md p-6 sm:p-10 space-y-8">
                
                {/* Section Title Banner */}
                <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                  <h2 className="font-sans text-xl font-extrabold text-gray-900 tracking-tight">
                    Section {activeTab + 1}: {SECTIONS[activeTab].label}
                  </h2>
                  <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 py-1 px-2.5 rounded-full">
                     {activeTab + 1} / 5
                  </span>
                </div>

                {/* FIELDS RENDERED BY STEPS */}
                <div className="space-y-6">
                  
                  {/* STEP 2: Employment & Income */}
                  {activeTab === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Current / Last Employer</label>
                        <input
                          type="text"
                          value={formData.currentEmployer}
                          onChange={(e) => handleFieldChange("currentEmployer", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                          placeholder="Hospital or Clinic Name"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Current Job Title</label>
                        <input
                          type="text"
                          value={formData.jobTitle}
                          onChange={(e) => handleFieldChange("jobTitle", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Clinical Department / Specialty</label>
                        <select
                          value={formData.department}
                          onChange={(e) => handleFieldChange("department", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>ICU / CCU</option>
                          <option>Emergency Room (ER)</option>
                          <option>Operation Theater (OT)</option>
                          <option>Pediatrics</option>
                          <option>Maternity / OB-GYN</option>
                          <option>General Medicine / Surgical Ward</option>
                          <option>Cardiology</option>
                          <option>Oncology</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Total Years of Clinical Experience</label>
                        <input
                          type="number"
                          value={formData.experienceYears}
                          onChange={(e) => handleFieldChange("experienceYears", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Current Monthly Income in Pakistan (PKR)</label>
                        <input
                          type="text"
                          value={formData.monthlyIncome}
                          onChange={(e) => handleFieldChange("monthlyIncome", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                          placeholder="e.g. 150,000 PKR"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Primary Source of Income</label>
                        <select
                          value={formData.incomeSource}
                          onChange={(e) => handleFieldChange("incomeSource", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Govt Hospital Salary</option>
                          <option>Private Hospital Salary</option>
                          <option>Dual Salary (Govt + Private Evening)</option>
                          <option>Home Nursing Practice</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Employment Status</label>
                        <select
                          value={formData.currentEmploymentStatus}
                          onChange={(e) => handleFieldChange("currentEmploymentStatus", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Full-Time</option>
                          <option>Part-Time</option>
                          <option>Contractual</option>
                          <option>Unemployed</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Private clinical home practice?</label>
                        <select
                          value={formData.hasPrivatePractice}
                          onChange={(e) => handleFieldChange("hasPrivatePractice", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>No</option>
                          <option>Yes (Part-Time)</option>
                          <option>Yes (Primary)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Prior Overseas Clinical Experience (Years)</label>
                        <input
                          type="number"
                          value={formData.totalOverseasExperience}
                          onChange={(e) => handleFieldChange("totalOverseasExperience", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Usual Work Shift Type</label>
                        <select
                          value={formData.workShiftType}
                          onChange={(e) => handleFieldChange("workShiftType", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Rotational</option>
                          <option>Day Only</option>
                          <option>Night Only</option>
                          <option>On-Call / Casual</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Availability */}
                  {activeTab === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Ready to relocate internationally? *</label>
                        <select
                          value={formData.readyToRelocate}
                          onChange={(e) => handleFieldChange("readyToRelocate", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 font-bold text-blue-600"
                        >
                          <option>Yes</option>
                          <option>No</option>
                          <option>Undecided</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Preferred Country (Choice 1)</label>
                        <select
                          value={formData.preferredCountry1}
                          onChange={(e) => handleFieldChange("preferredCountry1", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>United Kingdom</option>
                          <option>Saudi Arabia</option>
                          <option>United Arab Emirates</option>
                          <option>Ireland</option>
                          <option>Germany</option>
                          <option>Qatar</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Preferred Country (Choice 2)</label>
                        <select
                          value={formData.preferredCountry2}
                          onChange={(e) => handleFieldChange("preferredCountry2", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Saudi Arabia</option>
                          <option>United Arab Emirates</option>
                          <option>United Kingdom</option>
                          <option>Ireland</option>
                          <option>Germany</option>
                          <option>Qatar</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Preferred Country (Choice 3)</label>
                        <select
                          value={formData.preferredCountry3}
                          onChange={(e) => handleFieldChange("preferredCountry3", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>United Arab Emirates</option>
                          <option>Saudi Arabia</option>
                          <option>United Kingdom</option>
                          <option>Ireland</option>
                          <option>Germany</option>
                          <option>Qatar</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Earliest Relocation Date</label>
                        <select
                          value={formData.earliestStartDate}
                          onChange={(e) => handleFieldChange("earliestStartDate", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Immediately</option>
                          <option>Within 3 Months</option>
                          <option>Within 6 Months</option>
                          <option>Next Year</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Will you require Visa Sponsorship?</label>
                        <select
                          value={formData.requiresVisaSponsorship}
                          onChange={(e) => handleFieldChange("requiresVisaSponsorship", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Traveling with dependent family members?</label>
                        <select
                          value={formData.travelingWithFamily}
                          onChange={(e) => handleFieldChange("travelingWithFamily", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>No</option>
                          <option>Yes (Spouse Only)</option>
                          <option>Yes (Spouse and Children)</option>
                          <option>Yes (Parents Only)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Preferred Hospital Structure</label>
                        <select
                          value={formData.preferredHospitalType}
                          onChange={(e) => handleFieldChange("preferredHospitalType", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Public (NHS/Govt)</option>
                          <option>Private Tertiary Hospital</option>
                          <option>Military / Combined Military</option>
                          <option>Specialist Day-Care Clinic</option>
                        </select>
                      </div>

                      <div className="col-span-1 md:col-span-2 space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Language Proficiencies</label>
                        <input
                          type="text"
                          value={formData.languageProficiency}
                          onChange={(e) => handleFieldChange("languageProficiency", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                          placeholder="e.g. Urdu, English (IELTS Band 7)"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Safety & Wellbeing */}
                  {activeTab === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Any active safety/wellbeing concerns?</label>
                        <select
                          value={formData.safetyConcerns}
                          onChange={(e) => handleFieldChange("safetyConcerns", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>No</option>
                          <option>Yes (Workplace understaffing stress)</option>
                          <option>Yes (Late-night commute safety)</option>
                          <option>Yes (General physical strain)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Experienced harassment at work?</label>
                        <select
                          value={formData.harassmentExperience}
                          onChange={(e) => handleFieldChange("harassmentExperience", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>No</option>
                          <option>Yes (Verbal abuse from patient relatives)</option>
                          <option>Yes (Systemic bias)</option>
                          <option>Prefer not to say</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Current Workplace Safety Rating</label>
                        <select
                          value={formData.workplaceSafetyRating}
                          onChange={(e) => handleFieldChange("workplaceSafetyRating", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Excellent (5/5)</option>
                          <option>Good (4/5)</option>
                          <option>Moderate (3/5)</option>
                          <option>Poor (2/5)</option>
                          <option>Critical (1/5)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Need peer support groups abroad?</label>
                        <select
                          value={formData.supportGroupNeeds}
                          onChange={(e) => handleFieldChange("supportGroupNeeds", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Interested in mental health programs?</label>
                        <select
                          value={formData.wellnessProgramsInterest}
                          onChange={(e) => handleFieldChange("wellnessProgramsInterest", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Want Pakistani peer mentorship abroad?</label>
                        <select
                          value={formData.peerMentorshipInterest}
                          onChange={(e) => handleFieldChange("peerMentorshipInterest", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Require cultural integration training?</label>
                        <select
                          value={formData.culturalTrainingNeed}
                          onChange={(e) => handleFieldChange("culturalTrainingNeed", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: App Viability */}
                  {activeTab === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Passport Validity Check</label>
                        <select
                          value={formData.passportValidity}
                          onChange={(e) => handleFieldChange("passportValidity", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes (More than 2 years)</option>
                          <option>Yes (1-2 years remaining)</option>
                          <option>No passport currently</option>
                          <option>Expired (Under renewal)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">English Exam Status (IELTS / OET)</label>
                        <select
                          value={formData.ieltsOetScore}
                          onChange={(e) => handleFieldChange("ieltsOetScore", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500 font-semibold"
                        >
                          <option>Not taken yet</option>
                          <option>Cleared with IELTS (7.0+ overall)</option>
                          <option>Cleared with OET (Grade B+)</option>
                          <option>Booked exam date</option>
                          <option>Failed (Planning to retake)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Expected IELTS/OET Exam Date (If booked)</label>
                        <input
                          type="date"
                          value={formData.ieltsExamDate}
                          onChange={(e) => handleFieldChange("ieltsExamDate", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Primary motivator for moving abroad</label>
                        <select
                          value={formData.motivatorsForWorkingAbroad}
                          onChange={(e) => handleFieldChange("motivatorsForWorkingAbroad", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Higher income & supporting family back home</option>
                          <option>Professional hospital experience & career growth</option>
                          <option>Better social safety & schooling for children</option>
                          <option>Escaping workplace stress or local politics</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Target Monthly Savings Rate Abroad</label>
                        <select
                          value={formData.financialSavingsTarget}
                          onChange={(e) => handleFieldChange("financialSavingsTarget", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>60-80%</option>
                          <option>40-60%</option>
                          <option>20-40%</option>
                          <option>Unsure / All spent on living</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Do you expect relocation allowance from hospital?</label>
                        <select
                          value={formData.expectedRelocationAllowance}
                          onChange={(e) => handleFieldChange("expectedRelocationAllowance", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Yes</option>
                          <option>No (Self-funded relocation acceptable)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Prior Visa Refusals for destination countries?</label>
                        <select
                          value={formData.hasPendingVisaRefusals}
                          onChange={(e) => handleFieldChange("hasPendingVisaRefusals", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>No</option>
                          <option>Yes (UK)</option>
                          <option>Yes (Schengen/Europe)</option>
                          <option>Yes (US/Canada)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Final Remarks */}
                  {activeTab === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">How did you hear about our portal?</label>
                        <select
                          value={formData.referralSource}
                          onChange={(e) => handleFieldChange("referralSource", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                        >
                          <option>Social Media (Facebook/Instagram)</option>
                          <option>LinkedIn</option>
                          <option>PNC Official Newsletter</option>
                          <option>Friend / Peer Recommendation</option>
                          <option>WhatsApp Healthcare Group</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Additional Remarks or Special Notes</label>
                        <textarea
                          rows={4}
                          value={formData.additionalInfo}
                          onChange={(e) => handleFieldChange("additionalInfo", e.target.value)}
                          className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
                          placeholder="Detail any specific requests, references, or family situations..."
                        />
                      </div>

                      {/* Error Banner */}
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 font-sans text-xs" id="survey-error">
                          {error}
                        </div>
                      )}

                      {/* Consent checkbox */}
                      <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <input
                          type="checkbox"
                          id="consentChecked"
                          checked={formData.consentChecked}
                          onChange={(e) => handleFieldChange("consentChecked", e.target.checked)}
                          className="h-4 w-4 mt-1 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="consentChecked" className="font-sans text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                          I hereby consent to verify my PNC License and CV details with international hospital registries. I authorize Global Nurse Recruitment Portal to share my surveyed specialties with official medical sponsors in my preferred countries.
                        </label>
                      </div>
                    </div>
                  )}

                </div>

                {/* Form Controls */}
                <div className="border-t border-gray-100 pt-6 flex justify-between">
                  <button
                    onClick={handlePrev}
                    disabled={activeTab === 0}
                    className={`py-2.5 px-5 rounded-xl font-sans text-sm font-semibold border flex items-center gap-1.5 cursor-pointer ${
                      activeTab === 0
                        ? "border-gray-100 text-gray-300 cursor-not-allowed"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-98"
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {activeTab < 4 ? (
                    <button
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-xl font-sans text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <span>Next Section</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleFormSubmit}
                      disabled={submitting || !formData.consentChecked}
                      className={`py-2.5 px-6 rounded-xl font-sans text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer ${
                        submitting || !formData.consentChecked
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg active:scale-98"
                      }`}
                      id="survey-submit-btn"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting Profile...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Submit Combined Application</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>

            </motion.div>
          ) : (
            
            // STATE 2: SURVEY SUBMITTED SUCCESSFULLY
            <motion.div
              key="success-splash"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-xl p-8 sm:p-12 text-center space-y-6"
              id="submission-success-view"
            >
              <div className="bg-green-100 p-4 rounded-full text-green-600 inline-block">
                <CheckCircle className="h-12 w-12" />
              </div>
              
              <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight">
                Profile Submitted!
              </h2>
              
              <p className="font-sans text-sm text-gray-500 leading-relaxed">
                Thank you, <span className="font-bold text-gray-800">{formData.fullName}</span>. Your Pakistan Nursing Council license credentials and placement preferences have been verified and securely recorded in our placement registry.
              </p>

              <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-left font-sans text-xs space-y-2">
                <p className="font-bold text-gray-800">What happens next?</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Our compliance team will cross-verify your PNC License status.</li>
                  <li>Sponsoring international hospitals will review your specialty experience.</li>
                  <li>We will reach out via <span className="font-semibold text-gray-800">{formData.email}</span> with interview booking schedules.</li>
                </ol>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setActiveTab(0);
                    // Reset name/email/phone defaults or leave as is
                    navigate("/");
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-2xl font-sans text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg"
                >
                  <Home className="h-4.5 w-4.5" />
                  <span>Return to Home</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>
    </div>
  );
}
