"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { COUNTIES_LIST, getCountyCoordinates } from "@/lib/location";

type BusinessCategory = {
  id: string;
  name: string;
};

const COUNTRIES = ["Liberia", "Sierra Leone", "Guinea", "Ghana", "Nigeria"];

export default function BusinessOnboardingPage() {
  const router = useRouter();

  // Categories
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("Liberia");
  const [city, setCity] = useState("Bong");
  const [description, setDescription] = useState("");

  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [ownerIdState, setOwnerIdState] = useState<string | null>(null);

  // Read URL query parameters and sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const qName = urlParams.get("name");
      const qPhone = urlParams.get("phone");
      const qEmail = urlParams.get("email");
      const qCategory = urlParams.get("category");
      const qOwnerId = urlParams.get("owner_id");

      let prefill: { name?: string; phone?: string; email?: string; category?: string; owner_id?: string } | null = null;
      const cached = sessionStorage.getItem("minzo_onboarding_prefill");
      if (cached) {
        prefill = JSON.parse(cached);
      }

      if (qName || prefill?.name) setBusinessName(qName || prefill?.name || "");
      if (qPhone || prefill?.phone) setPhone(qPhone || prefill?.phone || "");
      if (qEmail || prefill?.email) setEmail(qEmail || prefill?.email || "");
      if (qCategory || prefill?.category) setCategoryId(qCategory || prefill?.category || "");
      if (qOwnerId || prefill?.owner_id) setOwnerIdState(qOwnerId || prefill?.owner_id || null);
    } catch (e) {
      console.warn("Could not parse onboarding prefill:", e);
    }
  }, []);

  // Fetch Categories from Supabase
  useEffect(() => {
    let isActive = true;

    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name")
          .order("name");

        if (!isActive) return;

        if (error) {
          console.warn("Categories fetch warning:", error.message);
        }

        if (data && data.length > 0) {
          setCategories(data);
          setCategoryId(data[0].id);
        } else {
          const fallback: BusinessCategory[] = [
            { id: "1", name: "Hospital" },
            { id: "2", name: "Clinic" },
            { id: "3", name: "Pharmacy" },
            { id: "4", name: "Diagnostic Lab" },
          ];
          setCategories(fallback);
          setCategoryId(fallback[0].id);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        if (isActive) {
          setLoadingCategories(false);
        }
      }
    }

    void loadCategories();
    return () => {
      isActive = false;
    };
  }, []);

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 500) {
      setDescription(e.target.value);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!businessName.trim()) {
      setErrorMessage("Please enter your business name.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Please select a business category.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Please enter your phone number.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!address.trim()) {
      setErrorMessage("Please enter your business location or address.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Get current authenticated user if logged in
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const effectiveOwnerId = user?.id || ownerIdState || null;

      // 2. Call the server onboarding endpoint (runs with privileged service role, avoiding RLS 401 error)
      const res = await fetch("/api/businesses/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: businessName.trim(),
          category_id: categoryId,
          phone: phone.trim(),
          public_email: email.trim(),
          address: address.trim(),
          country,
          city,
          county: city,
          town: address.trim() || city,
          website_url: website.trim() || null,
          description: description.trim() || null,
          owner_id: effectiveOwnerId,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Could not submit your business. Please try again.");
      }

      setSuccessMessage(
        "Your business listing has been submitted successfully for approval! Redirecting...",
      );

      // Reset form
      setBusinessName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setWebsite("");
      setDescription("");

      setTimeout(() => {
        router.push("/signUp/onboarding/success");
      }, 1500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Could not submit your business. Please check your information and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#212934] font-sans">
      <div className="mx-auto max-w-[1024px] px-6 py-10 sm:px-10 lg:px-20">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" aria-label="Minzo home">
            <Image
              src="/images/minzoLogo.png"
              alt="Minzo logo"
              width={50}
              height={50}
              priority
              className="h-[50px] w-[50px] object-contain"
            />
          </Link>
        </div>

        {/* Title and Subtitle matching exact Figma text and colors */}
        <div className="mb-8">
          <h1 className="text-[32px] font-medium leading-[39px] text-[#4AB057]">
            Add your business
          </h1>
          <p className="mt-1 text-[18px] font-medium leading-[22px] text-black/50">
            Help people discover your business in Liberia
          </p>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200"
          >
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="mb-6 rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800 border border-emerald-200"
          >
            {successMessage}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit}>
          {/* Top 4 Rows: 2-Column Grid (Left: col 1, Right: col 2) */}
          <div className="grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2">
            {/* ROW 1 */}
            <div>
              <label
                htmlFor="business-name"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                id="business-name"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g  Golden Healthcare"
                className="h-[35px] sm:h-[40px] w-full rounded-lg border border-[#D5DDE5] bg-white px-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
              />
            </div>

            <div>
              <label
                htmlFor="business-category"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Business Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="business-category"
                  name="businessCategory"
                  required
                  disabled={loadingCategories || categories.length === 0}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-[35px] sm:h-[40px] w-full appearance-none rounded-lg border border-[#D5DDE5] bg-white px-3.5 pr-8 text-sm text-[#212934] shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
                >
                  <option value="" disabled>
                    {loadingCategories
                      ? "Loading categories..."
                      : "Select Category"}
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg
                    className="h-3.5 w-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* ROW 2 */}
            <div>
              <label
                htmlFor="phone-number"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone-number"
                name="phoneNumber"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g +231780835562"
                className="h-[35px] sm:h-[40px] w-full rounded-lg border border-[#D5DDE5] bg-white px-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
              />
            </div>

            <div>
              <label
                htmlFor="email-address"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email-address"
                name="emailAddress"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g info@hopehill.com.lr.."
                className="h-[35px] sm:h-[40px] w-full rounded-lg border border-[#D5DDE5] bg-white px-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
              />
            </div>

            {/* ROW 3 */}
            <div>
              <label
                htmlFor="address"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Address or Loaction <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g  Enter business location"
                className="h-[35px] sm:h-[40px] w-full rounded-lg border border-[#D5DDE5] bg-white px-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
              />
            </div>

            <div>
              <label
                htmlFor="website"
                className="mb-1.5 block text-xs font-semibold text-[#212934]"
              >
                Website (Optional)
              </label>
              <input
                id="website"
                name="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g www.hopehill.com.lr.."
                className="h-[35px] sm:h-[40px] w-full rounded-lg border border-[#D5DDE5] bg-white px-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
              />
            </div>

            {/* ROW 4 */}
            <div>
              <label
                htmlFor="country"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="country"
                  name="country"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-[35px] sm:h-[40px] w-full appearance-none rounded-lg border border-[#D5DDE5] bg-white px-3.5 pr-8 text-sm text-[#212934] shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg
                    className="h-3.5 w-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="city"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#212934]"
              >
                City <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="city"
                  name="city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-[35px] sm:h-[40px] w-full appearance-none rounded-lg border border-[#D5DDE5] bg-white px-3.5 pr-8 text-sm text-[#212934] shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057]"
                >
                  {COUNTIES_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg
                    className="h-3.5 w-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Left Side (Description + Submit) | Right Side (Image) */}
          <div className="mt-6 grid grid-cols-1 items-start gap-x-12 gap-y-6 md:grid-cols-2">
            {/* Bottom-Left: Description Textarea + Submit Button */}
            <div className="space-y-6">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="description"
                    className="flex items-center gap-1 text-xs font-semibold text-[#212934]"
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-400 font-medium">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={5}
                  required
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Tell us about your business"
                  className="h-[136px] w-full rounded-lg border border-[#D5DDE5] bg-white p-3.5 text-sm text-[#212934] placeholder:text-gray-400 shadow-[0_2px_2px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#4AB057] focus:ring-1 focus:ring-[#4AB057] resize-none"
                />
              </div>

              {/* Submit for approval button */}
              <button
                type="submit"
                disabled={submitting || loadingCategories}
                className="h-[44px] w-full rounded-lg bg-[#163B65] px-6 text-sm font-semibold text-white transition hover:bg-[#204975] focus:outline-none focus:ring-2 focus:ring-[#4AB057] focus:ring-offset-2 disabled:opacity-50"
              >
                {submitting ? "Submitting for approval..." : "Submit for approval"}
              </button>
            </div>

            {/* Bottom-Right: Image matching Figma position [x: 501, y: 503, w: 455, h: 432] */}
            <div className="flex justify-end">
              <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-100 max-w-[455px] w-full">
                <Image
                  src="/images/unsplash_qoExpyvjY50.png"
                  alt="Healthcare facility representation"
                  width={455}
                  height={432}
                  priority
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

