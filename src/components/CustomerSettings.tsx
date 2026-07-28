/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CompanyProfile } from '../types';
import {
  Settings,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  Image,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

interface CustomerSettingsProps {
  activeCompany: CompanyProfile;
  onUpdateCompany: (company: CompanyProfile) => void;
  appsScriptUrl?: string;
}

export default function CustomerSettings({
  activeCompany,
  onUpdateCompany,
  appsScriptUrl
}: CustomerSettingsProps) {
  const [name, setName] = useState(activeCompany.name || '');
  const [username, setUsername] = useState(activeCompany.username || '');
  const [passcode, setPasscode] = useState(activeCompany.passcode || '');
  const [contactPerson, setContactPerson] = useState(activeCompany.contactPerson || '');
  const [contactEmail, setContactEmail] = useState(activeCompany.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(activeCompany.contactPhone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(activeCompany.deliveryAddress || '');
  const [logoUrl, setLogoUrl] = useState(activeCompany.logoUrl || '');

  const [showPasscode, setShowPasscode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize internal form state when activeCompany prop changes
  useEffect(() => {
    setName(activeCompany.name || '');
    setUsername(activeCompany.username || '');
    setPasscode(activeCompany.passcode || '');
    setContactPerson(activeCompany.contactPerson || '');
    setContactEmail(activeCompany.contactEmail || '');
    setContactPhone(activeCompany.contactPhone || '');
    setDeliveryAddress(activeCompany.deliveryAddress || '');
    setLogoUrl(activeCompany.logoUrl || '');
  }, [activeCompany]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSaved(false);

    if (!name.trim()) {
      setErrorMsg('Company Name cannot be empty.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Portal Username cannot be empty.');
      return;
    }
    if (!passcode.trim()) {
      setErrorMsg('Passcode cannot be empty.');
      return;
    }
    if (!contactEmail.trim()) {
      setErrorMsg('Contact Email cannot be empty.');
      return;
    }

    const updated: CompanyProfile = {
      ...activeCompany,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      passcode: passcode.trim(),
      contactPerson: contactPerson.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      logoUrl: logoUrl.trim()
    };

    onUpdateCompany(updated);
    setIsSaved(true);

    setTimeout(() => {
      setIsSaved(false);
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-2 border-black p-6 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center space-x-3 text-black">
          <Settings className="w-6 h-6" />
          <h2 className="text-xl font-black uppercase tracking-tight text-black">
            Customer Profile & Portal Settings
          </h2>
        </div>
        <p className="text-xs text-gray-600 font-mono">
          Update your company details, credentials, contact rep, and shipping information. Changes will automatically sync to your cloud portal account and persist across all devices.
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border-2 border-black p-6 sm:p-8 rounded-2xl shadow-md space-y-8">
        {/* Success Banner */}
        {isSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border-2 border-emerald-600 text-emerald-950 p-4 rounded-xl flex items-center justify-between shadow-xs font-mono text-xs font-bold"
          >
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Settings updated successfully! Changes saved to cloud database and local storage.</span>
            </div>
          </motion.div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-50 border-2 border-red-500 text-red-900 p-4 rounded-xl flex items-center space-x-2 font-mono text-xs font-bold">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: LOGIN CREDENTIALS */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-2 flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-black" />
            <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-black">
              Portal Access Credentials
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Portal Username *
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. acme"
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl font-mono font-bold focus:outline-none"
                  id="settings-username-input"
                />
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                Used to log into your client dashboard
              </span>
            </div>

            {/* Passcode */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Portal Passcode *
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showPasscode ? 'text' : 'password'}
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs pl-10 pr-10 py-2.5 rounded-xl font-mono font-bold focus:outline-none"
                  id="settings-passcode-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 text-gray-400 hover:text-black cursor-pointer"
                  title={showPasscode ? 'Hide Passcode' : 'Show Passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                Keep passcode secure for authorized company buyers
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: COMPANY INFORMATION */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-2 flex items-center space-x-2">
            <Building className="w-4 h-4 text-black" />
            <h3 className="font-mono text-xs font-extrabold uppercase tracking-wider text-black">
              Company & Brand Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corporate Solutions"
                className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs p-2.5 rounded-xl font-bold focus:outline-none text-black"
                id="settings-company-name-input"
              />
            </div>

            {/* Representative Name */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Contact Person / Buyer Rep
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Marcus Vance"
                className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs p-2.5 rounded-xl font-semibold focus:outline-none text-black"
                id="settings-contact-person-input"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Contact Email *
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. buyer@acme.corp"
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl font-mono focus:outline-none text-black"
                  id="settings-contact-email-input"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Contact Phone
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 234-5678"
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl font-mono focus:outline-none text-black"
                  id="settings-contact-phone-input"
                />
              </div>
            </div>

            {/* Company Logo URL */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Company Logo Image URL (Optional)
              </label>
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Image className="absolute left-3.5 w-4 h-4 text-gray-400 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl font-mono focus:outline-none text-black"
                    id="settings-logo-url-input"
                  />
                </div>
                {logoUrl && (
                  <div className="w-10 h-10 rounded-xl border border-black overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                    <img src={logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono font-bold uppercase text-gray-600 mb-1">
                Default Delivery & Shipping Address
              </label>
              <div className="relative">
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="123 Corporate Way, Suite 400, City, State..."
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white text-xs p-3 rounded-xl font-sans focus:outline-none text-black"
                  id="settings-address-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end border-t border-gray-200 pt-6">
          <button
            type="submit"
            className="bg-black text-white hover:bg-gray-800 px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 cursor-pointer transition-all border border-black shadow-md hover:scale-102 active:scale-98"
            id="save-settings-btn"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
