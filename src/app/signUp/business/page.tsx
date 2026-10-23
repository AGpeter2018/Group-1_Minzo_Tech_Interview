"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type HomeDetail = {
  icon: string;
  text: string;
};

type BusinessCategory = {
  id: string;
  name: string;
};

const homeDetails: HomeDetail[] = [
  {
    icon: "/images/bi_hospital-fill (1).png",
    text: "Showcase your services",
  },
  {
    icon: "/images/fluent_people-community-28-filled.png",
    text: "Reach more patients",
  },
  {
    icon: "/images/ion_cellular.png",
    text: "Manage your profile",
  },
];

const BusinessSignUp = () => {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  

  useEffect(() => {
    let isActive = true;

    const loadCategories = async () => {
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
          // Fallback categories if database table has no rows yet
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
        console.error("Categories fetch unexpected error:", err);
      } finally {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      }
    };

    void loadCategories();
    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Please select a business category.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/signUp/businessSignUp`,
          data: {
            role: "business_owner",
            account_type: "business_owner",
            full_name: ownerName.trim(),
            phone: phone.trim(),
            business_name: businessName.trim(),
            category_id: categoryId,
            business_phone: phone.trim(),
          },
        },
      });

      if (error) throw error;
      if (data.user?.identities?.length === 0) {
        throw new Error(
          "An account with this email already exists. Please log in.",
        );
      }

      const userId = data.user?.id;
      if (userId) {
        try {
          // Upsert profile record
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: ownerName.trim(),
            phone: phone.trim(),
            role: "business_owner",
          });

          // Generate unique slug
          const slug =
            businessName
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)+/g, "") +
            "-" +
            Math.random().toString(36).substring(2, 6);

          // Insert business record
          await supabase.from("businesses").insert({
            name: businessName.trim(),
            slug,
            category_id: categoryId,
            owner_id: userId,
            phone: phone.trim(),
            public_email: email.trim(),
            source: "business_registration",
            verification_status: "pending",
            record_status: "pending",
            is_published: false,
          });
        } catch (dbErr) {
          console.warn("Profile/business creation deferred or handled by trigger:", dbErr);
        }
      }

      setSuccessMessage(
        data.session
          ? "Your business account has been created. Its listing is pending verification."
          : "Registration received! Please check your email to confirm your account. Your business listing is pending verification.",
      );

      // Reset form fields upon success
      setCategoryId("");
      setBusinessName("");
      setOwnerName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#17324D]">
      <header className="border-b border-[#E8EDF2]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Minzo home">
            <Image
              src="/images/minzoLogo.png"
              alt="Minzo logo"
              height={50}
              width={50}
              priority
              className="object-contain"
            />
          </Link>
          <p className="flex items-center gap-2 text-sm text-[#526579]">
            Already have an account?
            <Link
              href="/auth/login"
              className="font-semibold text-[#163B65] hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-12 px-6 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="min-w-0">
          <h1 className="max-w-lg text-3xl font-semibold leading-tight text-[#000000]">
            Grow your practice and reach more patients
          </h1>
          <ul className="mt-7 space-y-4">
            {homeDetails.map((detail) => (
              <li key={detail.icon} className="flex items-center gap-3">
                <Image
                  src={detail.icon}
                  alt=""
                  height={36}
                  width={36}
                  className="shrink-0 rounded-full bg-[#EAF1F5] p-2"
                />
                <span className="text-base text-[#000000]">{detail.text}</span>
              </li>
            ))}
          </ul>
          <Image
            src="/images/unsplash_qoExpyvjY50.png"
            alt="Healthcare business growth"
            height={400}
            width={400}
            priority
            className="mt-8 h-auto w-full max-w-md rounded-sm object-cover"
          />
        </section>

        <section className="min-w-0">
          <h2 className="text-2xl font-semibold text-[#000000]">
            Create a business account
          </h2>
          <p className="mt-2 text-sm text-[#66798B]">
            Set up your business profile in a few steps.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-6 rounded-sm bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p
              role="status"
              className="mt-6 rounded-sm bg-green-50 p-3 text-sm text-green-800"
            >
              {successMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="business-name"
                className="mb-1.5 block text-sm font-medium"
              >
                Business name
              </label>
              <input
                id="business-name"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="e.g. Golden Healthcare"
                className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#D5DDE5]"
              />
            </div>

            <div>
              <label
                htmlFor="business-type"
                className="mb-1.5 block text-sm font-medium"
              >
                Business type
              </label>
              <select
                id="business-type"
                name="businessType"
                required
                disabled={isLoadingCategories || categories.length === 0}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-11 w-full rounded-sm border border-[#D5DDE5] bg-white px-3 text-sm text-[#526579] outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
              >
                <option value="" disabled>
                  {isLoadingCategories
                    ? "Loading categories..."
                    : "Select a category"}
                </option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="owners-name"
                className="mb-1.5 block text-sm font-medium"
              >
                Owner&apos;s name
              </label>
              <input
                id="owners-name"
                name="ownersName"
                type="text"
                required
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
                placeholder="e.g. John Doe"
                className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
              />
            </div>

            <div>
              <label
                htmlFor="phone-number"
                className="mb-1.5 block text-sm font-medium"
              >
                Phone number
              </label>
              <input
                id="phone-number"
                name="phoneNumber"
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. +231 780 835 562"
                className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="e.g. @john.com"
                className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  placeholder="e.g. ********"
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#D5DDE5]"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="e.g. ********"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={
                isSubmitting || isLoadingCategories || categories.length === 0
              }
              className="h-11 w-full rounded-sm bg-[#163B65] px-4 text-sm font-semibold text-white transition hover:bg-[#245681] focus:outline-none focus:ring-2 focus:ring-[#9BBAD1] focus:ring-offset-2"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default BusinessSignUp;
