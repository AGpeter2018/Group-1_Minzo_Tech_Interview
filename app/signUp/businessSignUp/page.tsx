"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type HomeDetail = {
  icon: string;
  text: string;
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

const categories = ["Hospital", "Pharmacy", "Clinic"];

const BusinesssSignUp = () => {
  const [category, setCategory] = useState<string>("");
  const [BusinessName, setBusinessName] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

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
              href="/"
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

          <form className="mt-7 space-y-4">
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
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-11 w-full rounded-sm border border-[#D5DDE5] bg-white px-3 text-sm text-[#526579] outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                  className="h-11 w-full rounded-sm border border-[#D5DDE5] px-3 text-sm outline-none transition focus:border-[#3979A8] focus:ring-2 focus:ring-[#DCEAF3]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="h-11 w-full rounded-sm bg-[#163B65] px-4 text-sm font-semibold text-white transition hover:bg-[#245681] focus:outline-none focus:ring-2 focus:ring-[#9BBAD1] focus:ring-offset-2"
            >
              Create account
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default BusinesssSignUp;
