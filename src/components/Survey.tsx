import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowLeft, ArrowRight, Save, Briefcase, Globe, Heart, HelpCircle, FileCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { callEdgeFunction, supabase } from "../lib/supabase";

export default function Survey() {
  const location = useLocation();
  const navigate = useNavigate();

  const [extractedData, setExtractedData] = useState<any>(null);
  useEffect(() => {
    let data = location.state?.extractedData;
    if (!data) {
      const stored = sessionStorage.getItem("extractedData");
      if (stored) {
        try { data = JSON.parse(stored); } catch (_) {}
      }
    }
    if (data) setExtractedData(data);
  }, [location.state]);

  const extractedName = extractedData?.extractedName || "Candidate Nurse";

  const [activeTab, setActiveTab] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vehicleTransport: "",
    professionalQualification: "",
    specialization: [] as string[],
    totalYearsExperience: "",
    homeCareExperience: "",
    instituteName: "",
    employmentStatus: "",
    monthlyIncome: "",
    supplementalIncome: "",
    expectedShiftPay: "",
    weeklyAvailability: "",
    availableShifts: [] as string[],
    travelWillingness: "",
    transitionConsideration: "",
    preferredPatientTypes: [] as string[],
    comfortWorkingAlone: "",
    challengesExperienced: [] as string[],
    biggestFears: [] as string[],
    saferWithPlatform: "",
    describeIncident: "",
    awareOfPlatform: "",
    findWorkMethod: [] as string[],
    marketViability: "",
    featurePriorities: [] as string[],
    wouldRecommend: "",
    additionalComments: "",
    followUpConsent: "",
    privacyConsent: false,
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => {
      if (field === "specialization" || field === "availableShifts" || field === "preferredPatientTypes" || field === "challengesExperienced" || field === "biggestFears" || field === "findWorkMethod" || field === "featurePriorities") {
        const current = prev[field] as string[];
        if (current.includes(value)) {
          return { ...prev, [field]: current.filter((v) => v !== value) };
        } else {
          return { ...prev, [field]: [...current, value] };
        }
      }
      return { ...prev, [field]: value };
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
    if (!formData.privacyConsent) {
      setError("Please accept the data privacy statement before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        fullName: extractedData?.extractedName || formData.instituteName || "Candidate Nurse",
        email: extractedData?.extractedEmail || "",
        phone: extractedData?.extractedPhone || "",
        licenseNumber: extractedData?.extractedLicenseNumber || "",
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

  const handleAutoFill = () => {
    setFormData({
      // Background
      professionalQualification: "Bachelor of Science in Nursing (BSN)",
      specialization: ["ICU / CCU", "Cardiac care", "Post-surgical", "Geriatric Care"],
      totalYearsExperience: "6 - 10 years",
      homeCareExperience: "1 - 3 years",
      instituteName: "Holy Family Hospital, Rawalpindi",
      employmentStatus: "Full-time employed at hospital / clinic",
      // Availability
      monthlyIncome: "Rs. 75,001 to 1,00,000",
      supplementalIncome: "Yes",
      expectedShiftPay: "Rs. 2,500 - 3,500 per shift",
      weeklyAvailability: "20 - 40 hours / week (3-5 shifts)",
      availableShifts: ["Morning (7 am - 3 pm)", "Evening (3 pm - 11 pm)"],
      travelWillingness: "Yes - citywide",
      // Preferences
      vehicleTransport: "YES! I own a Car",
      transitionConsideration: "Yes - I am actively looking to switch",
      preferredPatientTypes: ["Post-surgical recovery", "Elderly / geriatric care", "Critical / ICU-level care"],
      comfortWorkingAlone: "4",
      // Challenges
      challengesExperienced: [
        "Patients or family members behaving disrespectfully or making unreasonable demands",
        "Delayed or non-payment by patients / agencies",
        "Lack of proper equipment or supplies at the patient's home",
        "Isolation — no colleague to consult during the shift",
      ],
      biggestFears: [
        "No legal protection or formal employment contract",
        "Personal safety, especially as a female nurse",
        "Lack of emergency backup if patient deteriorates",
      ],
      saferWithPlatform: "Yes — it would significantly increase my confidence",
      describeIncident:
        "Several times I have faced delayed payment from private patients after completing home nursing shifts. A few households did not have basic supplies like gloves or sanitizer. A platform that verifies patients beforehand would make me feel much safer and more professional.",
      // Platform
      awareOfPlatform: "No — I am not aware of any such platform",
      findWorkMethod: ["Through a nursing agency", "WhatsApp groups", "Hospital referral", "Word of mouth"],
      marketViability: "5",
      featurePriorities: [
        "Verified patient profiles and background-checked households",
        "Guaranteed and on-time payment after each shift",
        "24/7 emergency support line during shifts",
      ],
      wouldRecommend: "Yes — definitely",
      additionalComments:
        "A home nursing platform with verified patients, guaranteed payment, and emergency support would be a game-changer for Pakistani nurses. Many of us want to do home care but are held back by safety concerns and payment issues. I would join such a platform immediately.",
      followUpConsent: "Yes — happy to participate",
      privacyConsent: true,
    });
    // Also auto-navigate to section 4 (Platform) so user can see it's filled and submit
    setTimeout(() => setActiveTab(4), 300);
  };

  const SECTIONS = [
    { label: "Background", icon: Briefcase },
    { label: "Availability", icon: Globe },
    { label: "Preferences", icon: Heart },
    { label: "Challenges", icon: HelpCircle },
    { label: "Platform", icon: FileCheck },
  ];

  const CheckboxGroup = ({ options, selected, onChange, name }: any) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {options.map((opt: string) => {
        const checked = selected.includes(opt);
        return (
          <label
            key={opt}
            onClick={() => onChange(name, opt)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${checked ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
          >
            <input
              type="checkbox"
              name={name}
              readOnly
              checked={checked}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
            />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        );
      })}
    </div>
  );

  const Select = ({ label, value, onChange, options, required, multiple }: any) => (
    <div className="space-y-1.5">
      <label className="block font-sans text-xs font-bold text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>
      <select
        value={value}
        onChange={(e) => onChange(fieldNameFromLabel(label), multiple ? undefined : e.target.value)}
        multiple={multiple}
        className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );

  const fieldNameFromLabel = (label: string) => {
    const map: Record<string, string> = {
      "Professional qualification": "professionalQualification",
      "Total years of experience": "totalYearsExperience",
      "Experience in home care nursing": "homeCareExperience",
      "Current employment status": "employmentStatus",
      "Average monthly income from primary employment (PKR)": "monthlyIncome",
      "Do you currently earn any supplemental income from home nursing or private patients?": "supplementalIncome",
      "If offered fair pay, how much would you expect per shift for home nursing?": "expectedShiftPay",
      "How many hours per week are you available for home nursing work?": "weeklyAvailability",
      "Are you willing to travel to patient homes outside your immediate area?": "travelWillingness",
      "Would you consider transitioning to home nursing care as your primary employment?": "transitionConsideration",
      "How comfortable are you working alone with patients at their home?": "comfortWorkingAlone",
      "Would you feel safer working through a registered platform that verifies patient households, provides contracts, and offers emergency support?": "saferWithPlatform",
      "Are you aware of any app or digital platform for home nursing in Pakistan?": "awareOfPlatform",
      "How viable do you think a home nursing app is in Pakistan's current market?": "marketViability",
      "Would you recommend such a platform to other nurses you know?": "wouldRecommend",
      "May we contact you for a follow-up interview? (Compensated 30-minute call)": "followUpConsent",
    };
    return map[label] || label.toLowerCase().replace(/\s+/g, "_");
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="bg-blue-600 text-white py-12 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight">Home Nursing Placement Survey</h1>
            <p className="font-sans text-blue-100 mt-2 text-sm md:text-base">
              Welcome, <span className="font-bold text-white underline">{extractedName}</span>! Please answer the questionnaire below.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div key="survey-main" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-1.5">
                <span className="block font-sans text-[10px] font-bold text-gray-400 tracking-widest uppercase px-3 mb-2">Survey Sections</span>
                {SECTIONS.map((sec, idx) => {
                  const Icon = sec.icon;
                  const isActive = idx === activeTab;
                  return (
                    <button key={idx} onClick={() => setActiveTab(idx)} className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl font-sans text-sm font-medium ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"}`}>
                      <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
                      <span>{sec.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-9 bg-white border border-gray-100 rounded-3xl shadow-md p-6 sm:p-10 space-y-8">
                <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                  <h2 className="font-sans text-xl font-extrabold text-gray-900 tracking-tight">{SECTIONS[activeTab].label}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoFill}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                      id="autofill-btn"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Auto-fill Viability Demo</span>
                    </button>
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 py-1 px-2.5 rounded-full">{activeTab + 1} / 5</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {activeTab === 0 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Professional qualification <span className="text-red-500">*</span></label>
                        <select value={formData.professionalQualification} onChange={(e) => handleFieldChange("professionalQualification", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select qualification</option>
                          <option>Diploma in General Nursing (GDN)</option>
                          <option>Post RN BSN</option>
                          <option>Bachelor of Science in Nursing (BSN)</option>
                          <option>Master of Science in Nursing (MSN)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Specialization / Clinical area of practice <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["General Nursing","ICU / CCU","Paediatrics","Orthopedics","Cardiac care","Post-surgical","Geriatric Care","Wound Care","Maternity / Midwife","Physiotherapy assist","Dialysis","Radiology","Infection Control"]} selected={formData.specialization} onChange={handleFieldChange} name="specialization" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Total years of experience <span className="text-red-500">*</span></label>
                        <select value={formData.totalYearsExperience} onChange={(e) => handleFieldChange("totalYearsExperience", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select range</option>
                          <option>Less than 1 year</option>
                          <option>1 - 3 years</option>
                          <option>3 - 5 years</option>
                          <option>6 - 10 years</option>
                          <option>More than 10 years</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Experience in home care nursing <span className="text-red-500">*</span></label>
                        <select value={formData.homeCareExperience} onChange={(e) => handleFieldChange("homeCareExperience", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select experience</option>
                          <option>None - no prior home care</option>
                          <option>Less than 1 year</option>
                          <option>1 - 3 years</option>
                          <option>3 - 5 years</option>
                          <option>More than 5 years</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Name of institute where currently or previously working <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.instituteName} onChange={(e) => handleFieldChange("instituteName", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500" placeholder="Hospital / clinic name" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Current employment status <span className="text-red-500">*</span></label>
                        <select value={formData.employmentStatus} onChange={(e) => handleFieldChange("employmentStatus", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select status</option>
                          <option>Full-time employed at hospital / clinic</option>
                          <option>Part-time employed at hospital / clinic</option>
                          <option>Self-employed / Private practice</option>
                          <option>Unemployed / Seeking placement</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Average monthly income from primary employment (PKR) <span className="text-red-500">*</span></label>
                        <select value={formData.monthlyIncome} onChange={(e) => handleFieldChange("monthlyIncome", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select range</option>
                          <option>Below Rs. 50,000</option>
                          <option>Rs. 50,001 to 75,000</option>
                          <option>Rs. 75,001 to 1,00,000</option>
                          <option>Above Rs. 1,00,000</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Do you currently earn any supplemental income from home nursing or private patients? <span className="text-red-500">*</span></label>
                        <select value={formData.supplementalIncome} onChange={(e) => handleFieldChange("supplementalIncome", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">If offered fair pay, how much would you expect per shift for home nursing? <span className="text-red-500">*</span></label>
                        <select value={formData.expectedShiftPay} onChange={(e) => handleFieldChange("expectedShiftPay", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select range</option>
                          <option>Below Rs. 1,500 per shift</option>
                          <option>Rs. 1,500 - 2,500 per 8-hour shift</option>
                          <option>Rs. 2,500 - 3,500 per shift</option>
                          <option>Above Rs. 3,500 per shift</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">How many hours per week are you available for home nursing work? <span className="text-red-500">*</span></label>
                        <select value={formData.weeklyAvailability} onChange={(e) => handleFieldChange("weeklyAvailability", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select availability</option>
                          <option>Less than 10 hours per week</option>
                          <option>10 to 20 hours per week (1-2 shifts)</option>
                          <option>20 - 40 hours / week (3-5 shifts)</option>
                          <option>Full time (40+ hours)</option>
                          <option>Flexible - depends on the case</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Which shifts are you available for? (select all that apply) <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["Morning (7 am - 3 pm)","Evening (3 pm - 11 pm)","Night (11 pm - 7 am)","Hourly / on call only"]} selected={formData.availableShifts} onChange={handleFieldChange} name="availableShifts" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Are you willing to travel to patient homes outside your immediate area? <span className="text-red-500">*</span></label>
                        <select value={formData.travelWillingness} onChange={(e) => handleFieldChange("travelWillingness", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes - within 5 km radius</option>
                          <option>Yes - within 10 km radius</option>
                          <option>Yes - citywide</option>
                          <option>No</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Would you consider transitioning to home nursing care as your primary employment? <span className="text-red-500">*</span></label>
                        <select value={formData.transitionConsideration} onChange={(e) => handleFieldChange("transitionConsideration", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes - I am actively looking to switch</option>
                          <option>Yes - if income is equal to or better than hospital pay</option>
                          <option>Maybe - need more information</option>
                          <option>No - prefer hospital/clinic setting</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">What type of patients would you prefer to work with? (select all that apply) <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["Post-surgical recovery","Elderly / geriatric care","Cancer / palliative care","Critical / ICU-level care","Paediatric / newborn care","Mother and baby care","General assistance / ADLs"]} selected={formData.preferredPatientTypes} onChange={handleFieldChange} name="preferredPatientTypes" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">How comfortable are you working alone with patients at their home? <span className="text-red-500">*</span></label>
                        <select value={formData.comfortWorkingAlone} onChange={(e) => handleFieldChange("comfortWorkingAlone", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>1 - Not comfortable at all</option>
                          <option>2</option>
                          <option>3</option>
                          <option>4</option>
                          <option>5 - Very comfortable</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Do you own a vehicle or have reliable transport? <span className="text-red-500">*</span></label>
                        <select value={formData.vehicleTransport} onChange={(e) => handleFieldChange("vehicleTransport", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>YES! I own Motorcycle</option>
                          <option>YES! I own a Car</option>
                          <option>No I use public transport</option>
                          <option>No i depend on family/relative</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Have you experienced any of the following challenges in home nursing? (Select all that apply) <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["Patients or family members behaving disrespectfully or making unreasonable demands","Delayed or non-payment by patients / agencies","Lack of proper equipment or supplies at the patient's home","Being asked to perform tasks beyond the agreed scope of care","Isolation — no colleague to consult during the shift"]} selected={formData.challengesExperienced} onChange={handleFieldChange} name="challengesExperienced" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">What are your biggest fears or concerns about home nursing? (Select all that apply) <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["Being blamed if a patient's condition worsens at home","No legal protection or formal employment contract","Personal safety, especially as a female nurse","Lack of emergency backup if patient deteriorates","No support channel if an emergency arose during the shift"]} selected={formData.biggestFears} onChange={handleFieldChange} name="biggestFears" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Would you feel safer working through a registered platform that verifies patient households, provides contracts, and offers emergency support? <span className="text-red-500">*</span></label>
                        <select value={formData.saferWithPlatform} onChange={(e) => handleFieldChange("saferWithPlatform", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes — it would significantly increase my confidence</option>
                          <option>Maybe — depends on platform features</option>
                          <option>No — I prefer traditional referrals</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Please describe any specific incident or concern in your own words <span className="text-red-500">*</span></label>
                        <textarea value={formData.describeIncident} onChange={(e) => handleFieldChange("describeIncident", e.target.value)} rows={4} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500" placeholder="Optionally share a personal experience..." />
                      </div>
                    </div>
                  )}

                  {activeTab === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Are you aware of any app or digital platform for home nursing in Pakistan? <span className="text-red-500">*</span></label>
                        <select value={formData.awareOfPlatform} onChange={(e) => handleFieldChange("awareOfPlatform", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes — I actively use one</option>
                          <option>Yes — but I don't use it regularly</option>
                          <option>No — I am not aware of any such platform</option>
                          <option>Not yet</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">How do you currently find home nursing work? (Select all that apply) <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={["Through a nursing agency","WhatsApp groups","Hospital referral","Social media / online job boards","Word of mouth","Direct patient contact","Other"]} selected={formData.findWorkMethod} onChange={handleFieldChange} name="findWorkMethod" />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">How viable do you think a home nursing app is in Pakistan's current market? <span className="text-red-500">*</span></label>
                        <select value={formData.marketViability} onChange={(e) => handleFieldChange("marketViability", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>1 - Not viable</option>
                          <option>2</option>
                          <option>3</option>
                          <option>4</option>
                          <option>5 - Very viable</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Which features would be most important to you as a nurse on such a platform? Rank your top 3 priorities. <span className="text-red-500">*</span></label>
                        <CheckboxGroup options={[
                          "Verified patient profiles and background-checked households",
                          "Guaranteed and on-time payment after each shift",
                          "Advance salary / emergency loan facility",
                          "Shift management and scheduling via WhatsApp",
                          "24/7 emergency support line during shifts",
                          "Digital attendance and payslip record",
                          "Ability to rate and review patients / families",
                          "Legal contract for every assignment",
                          "Training and CPD resources",
                          "Option to set availability and decline unsuitable cases",
                        ]} selected={formData.featurePriorities} onChange={handleFieldChange} name="featurePriorities" />
                        <p className="text-xs text-gray-500">Please select up to 3.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Would you recommend such a platform to other nurses you know? <span className="text-red-500">*</span></label>
                        <select value={formData.wouldRecommend} onChange={(e) => handleFieldChange("wouldRecommend", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes — definitely</option>
                          <option>Yes — happy to participate</option>
                          <option>Maybe</option>
                          <option>No — survey only</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">Is there anything else you would like us to know? <span className="text-red-500">*</span></label>
                        <textarea value={formData.additionalComments} onChange={(e) => handleFieldChange("additionalComments", e.target.value)} rows={4} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500" placeholder="Your experience, expectations, or suggestions..." />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block font-sans text-xs font-bold text-gray-700">May we contact you for a follow-up interview? (Compensated 30-minute call) <span className="text-red-500">*</span></label>
                        <select value={formData.followUpConsent} onChange={(e) => handleFieldChange("followUpConsent", e.target.value)} className="w-full font-sans text-sm border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500">
                          <option value="">Select</option>
                          <option>Yes — happy to participate</option>
                          <option>No — survey only</option>
                        </select>
                      </div>

                      <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <input type="checkbox" id="privacyConsent" checked={formData.privacyConsent} onChange={(e) => handleFieldChange("privacyConsent", e.target.checked)} className="h-4 w-4 mt-1 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <label htmlFor="privacyConsent" className="font-sans text-xs text-gray-600 leading-relaxed cursor-pointer select-none">
                          Data privacy & consent: By submitting this form you consent to Home Care App storing your responses for product research purposes. Your PNC license and CNIC numbers are collected solely for professional verification. No data will be shared with third parties or your employer. You may request deletion of your data at any time by contacting pkhomecareapp@gmail.com
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-6 flex justify-between">
                  <button onClick={handlePrev} disabled={activeTab === 0} className={`py-2.5 px-5 rounded-xl font-sans text-sm font-semibold border flex items-center gap-1.5 cursor-pointer ${activeTab === 0 ? "border-gray-100 text-gray-300 cursor-not-allowed" : "border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-98"}`}>
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {activeTab < 4 ? (
                    <button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-xl font-sans text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-98">
                      <span>Next Section</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={handleFormSubmit} disabled={submitting || !formData.privacyConsent} className={`py-2.5 px-6 rounded-xl font-sans text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer ${submitting || !formData.privacyConsent ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg active:scale-98"}`} id="survey-submit-btn">
                      {submitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Submit Application</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="success-splash" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-xl p-8 sm:p-12 text-center space-y-6" id="submission-success-view">
              <div className="bg-green-100 p-4 rounded-full text-green-600 inline-block"><CheckCircle className="h-12 w-12" /></div>
              <h2 className="font-sans text-3xl font-extrabold text-gray-900 tracking-tight">Application Received! 🎉</h2>
              <p className="font-sans text-sm text-gray-500 leading-relaxed">Your home nursing application has been received. We'll review your profile and contact you soon if there's a suitable placement or follow-up interview. ✨</p>
              <div className="pt-4">
                <button onClick={() => { setSubmitted(false); setActiveTab(0); navigate("/"); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-2xl font-sans text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg">
                  <ArrowLeft className="h-4.5 w-4.5" />
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
