import React, { useState } from 'react';
import axios from 'axios';
import {
  User, Mail, Lock, AlertCircle, Phone, Eye, EyeOff,
  Wrench, Settings, Package, Shield, CheckCircle,
} from 'lucide-react';
import { useReveal } from '../hooks/useReveal';
import { Link, useNavigate } from 'react-router-dom';
import {
  GoogleSignInButton,
  type GoogleRegistrationData,
} from '../components/GoogleSignInButton';


const PH_LOCAL_MOBILE_PATTERN = /^9\d{9}$/;

const normalizePhilippineMobileInput = (value: string) => {
  let digits = value.replace(/\D/g, '');

  // Accept pasted variants while keeping the visible field as the 10 digits
  // entered after the fixed +63 prefix.
  if (/^639\d{9}$/.test(digits)) digits = digits.slice(2);
  if (/^09\d{9}$/.test(digits)) digits = digits.slice(1);

  return digits.slice(0, 10);
};

const getPasswordChecks = (password: string) => ({
  minimumLength: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

const isStrongPassword = (password: string) =>
  Object.values(getPasswordChecks(password)).every(Boolean);

const generateStrongPassword = () => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + special;

  const randomIndex = (length: number) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] % length;
    }
    return Math.floor(Math.random() * length);
  };

  const chars = [
    uppercase[randomIndex(uppercase.length)],
    lowercase[randomIndex(lowercase.length)],
    numbers[randomIndex(numbers.length)],
    special[randomIndex(special.length)],
  ];

  while (chars.length < 14) {
    chars.push(all[randomIndex(all.length)]);
  }

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
};

export function CustomerRegister() {
  const ref = useReveal<HTMLDivElement>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    address: '',
    password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [
  googleRegistration,
  setGoogleRegistration,
] = useState<GoogleRegistrationData | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === 'phone_number'
        ? normalizePhilippineMobileInput(value)
        : value,
    }));
  };

  const phoneIsValid = PH_LOCAL_MOBILE_PATTERN.test(formData.phone_number);
  const passwordChecks = getPasswordChecks(formData.password);
  const passwordIsStrong = isStrongPassword(formData.password);

  const handleSuggestPassword = () => {
    const suggestedPassword = generateStrongPassword();
    setFormData((previous) => ({
      ...previous,
      password: suggestedPassword,
      confirm_password: suggestedPassword,
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleGoogleRegistrationRequired = (
  data: GoogleRegistrationData
) => {
  setGoogleError('');
  setMessage('');
  setStatus('idle');

  setGoogleRegistration(data);

  setFormData({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    username: '',
    email: data.email,
    phone_number: '',
    address: '',
    password: '',
    confirm_password: '',
  });
};


const cancelGoogleRegistration = () => {
  setGoogleRegistration(null);
  setGoogleError('');
  setMessage('');
  setStatus('idle');

  setFormData({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    address: '',
    password: '',
    confirm_password: '',
  });
};

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  setStatus('idle');
  setMessage('');

  if (!phoneIsValid) {
    setStatus('error');
    setMessage('Enter a valid Philippine mobile number: +63 followed by 10 digits starting with 9.');
    return;
  }

  if (!formData.address.trim()) {
    setStatus('error');
    setMessage('Address is required when creating a customer account.');
    return;
  }

  if (!passwordIsStrong) {
    setStatus('error');
    setMessage('A strong password is required. Please complete all password requirements.');
    return;
  }

  if (formData.password !== formData.confirm_password) {
    setStatus('error');
    setMessage('Passwords do not match. Please try again.');
    return;
  }

  setStatus('loading');

  

    try {

  if (googleRegistration) {

    await axios.post(
      '/api/auth/google/complete-register',
      {
        google_registration_token:
          googleRegistration.token,

        first_name:
          formData.first_name,

        last_name:
          formData.last_name,

        username:
          formData.username,

        phone_number:
          `+63${formData.phone_number}`,

        address:
          formData.address,

        password:
          formData.password,
      }
    );

    setStatus('success');

    setMessage(
      'Google account registration completed! Redirecting to login…'
    );

  } else {

    const dataToSubmit = {
      first_name:
        formData.first_name,

      last_name:
        formData.last_name,

      username:
        formData.username,

      email:
        formData.email,

      phone_number:
        `+63${formData.phone_number}`,

      address:
        formData.address,

      password:
        formData.password,
    };

    await axios.post(
      '/api/auth/register',
      {
        ...dataToSubmit,
        role: 'customer',
      }
    );

    setStatus('success');

    setMessage(
      'Account created! Redirecting to login…'
    );
  }


  setGoogleRegistration(null);

  setFormData({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    address: '',
    password: '',
    confirm_password: '',
  });


  setTimeout(
    () => navigate('/login'),
    2000
  );


} catch (err: unknown) {

  setStatus('error');

  const errorMessage =
    axios.isAxiosError<{
      error?: string
    }>(err)
      ? err.response?.data?.error
      : undefined;

  setMessage(
    errorMessage ||
      'An error occurred during registration.'
  );
}
};

  const floatingIcons = [
    { Icon: Wrench,   top: '10%',  left: '6%',   size: 26, delay: '0s',    duration: '9s',   rotation: 35  },
    { Icon: Settings, top: '20%',  right: '8%',   size: 30, delay: '1.5s',  duration: '12s',  rotation: -20 },
    { Icon: Shield,   bottom: '30%', left: '7%',  size: 24, delay: '3s',    duration: '10s',  rotation: 15  },
    { Icon: Package,  bottom: '12%', right: '6%', size: 28, delay: '0.8s',  duration: '8s',   rotation: 45  },
    { Icon: Lock,     top: '58%',  left: '5%',    size: 22, delay: '2s',    duration: '11s',  rotation: -40 },
    { Icon: User,     bottom: '45%', right: '5%', size: 22, delay: '4s',    duration: '9.5s', rotation: 25  },
  ];

  return (
    <div
      ref={ref}
      className="w-full min-h-[calc(100vh-64px)] bg-gradient-to-br from-[#064e3b] via-[#0b6044] to-[#07563e] flex items-center justify-center relative py-20 px-4 overflow-hidden"
    >
      {/* Success overlay */}
      {status === 'success' && (
        <div className="fixed inset-0 bg-[#043d2d]/[0.72] backdrop-blur-md flex items-center justify-center z-50 animate-fade-in px-4">
          <div className="w-full max-w-sm bg-[#0a5b42] border border-emerald-100/[0.15] p-8 rounded-2xl shadow-2xl text-center relative overflow-hidden animate-fade-up">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400" />
            <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-construction-500/20 blur-md animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="relative z-10 w-20 h-20 rounded-full border-4 border-construction-500 flex items-center justify-center bg-[#064633] shadow-lg shadow-construction-500/30">
                <CheckCircle className="w-10 h-10 text-construction-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-navy-100 to-white">Account Created!</h3>
            <p className="text-navy-300 mt-2 text-sm">{message}</p>
          </div>
        </div>
      )}

      {/* Blueprint grid */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.4) 2px, transparent 2px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.4) 2px, transparent 2px)
          `,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-construction-500/10 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-emerald-300/[0.12] blur-[100px] pointer-events-none animate-glow" />

      {/* SVG drafting overlays */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15%" cy="25%" r="120" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />
        <circle cx="15%" cy="25%" r="65"  stroke="#6ee7b7" strokeWidth="1"   fill="none" />
        <line x1="15%" y1="5%"  x2="15%" y2="45%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="0%"  y1="25%" x2="30%" y2="25%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <circle cx="85%" cy="75%" r="150" stroke="#6ee7b7" strokeWidth="1.5" strokeDasharray="8,6" fill="none" />
        <circle cx="85%" cy="75%" r="80"  stroke="#6ee7b7" strokeWidth="1"   fill="none" />
        <line x1="85%" y1="50%" x2="85%" y2="100%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="65%" y1="75%" x2="105%" y2="75%" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="10,10" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="10,10" />
      </svg>

      {/* Floating icons */}
      {floatingIcons.map((item, idx) => {
        const { Icon, top, left, right, bottom, size, delay, duration, rotation } = item;
        return (
          <div
            key={idx}
            className="absolute pointer-events-none animate-float opacity-[0.06] text-emerald-200"
            style={{ top, left, right, bottom, animationDelay: delay, animationDuration: duration }}
          >
            <Icon size={size} style={{ transform: `rotate(${rotation}deg)` }} />
          </div>
        );
      })}

      {/* ── Registration Card ── */}
      <div className="w-full max-w-xl bg-[#0a5b42]/[0.82] backdrop-blur-xl border border-emerald-100/[0.15] rounded-2xl shadow-2xl shadow-emerald-950/[0.35] p-8 relative overflow-hidden animate-fade-up z-10">

        {/* Top accent bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-400" />
        {/* Ruler notches */}
        <div className="absolute top-1 inset-x-0 h-2 flex justify-between px-6 pointer-events-none opacity-25">
          {[...Array(25)].map((_, i) => (
            <span key={i} className={`w-[1px] bg-white ${i % 5 === 0 ? 'h-2' : 'h-1'}`} />
          ))}
        </div>

        {/* Blueprint coordinates */}
        <span className="absolute top-3 left-3 text-[8px] font-mono text-navy-500 select-none">SYS_REG.v1.0</span>
        <span className="absolute top-3 right-3 text-[8px] font-mono text-navy-500 select-none">CUST_NEW</span>
        <span className="absolute bottom-3 left-3 text-[8px] font-mono text-navy-500 select-none">RAYJIN_HW</span>
        <span className="absolute bottom-3 right-3 text-[8px] font-mono text-navy-500 select-none">CONFIDENTIAL</span>

        {/* Header */}
        <div className="text-center mt-4 mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-construction-500 text-navy-950 shadow-lg shadow-construction-500/20"
              style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            >
              <User className="h-6 w-6" />
            </div>
          </div>
          <h2 className="text-3xl font-bold font-display bg-clip-text text-transparent bg-gradient-to-r from-white via-navy-100 to-white tracking-tight">
            Create Account
          </h2>
          <p className="text-navy-300 mt-2 text-sm">Register to access the customer dashboard</p>
        </div>



        {!googleRegistration ? (
  <>
    {/* Google error */}
    {googleError && (
      <div className="mb-4 p-3 bg-red-500/10 text-red-200 rounded-xl flex items-start gap-2 border border-red-500/20 animate-fade-in">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />

        <p className="text-xs font-medium">
          {googleError}
        </p>
      </div>
    )}


    <GoogleSignInButton
      mode="register"

      onError={(msg) =>
        setGoogleError(msg)
      }

      onRegistrationRequired={
        handleGoogleRegistrationRequired
      }
    />


    {/* Divider */}
    <div className="relative flex items-center my-6">

      <div className="flex-1 h-px bg-white/10" />

      <span className="px-4 text-xs font-mono text-navy-500 uppercase tracking-widest">
        or register with email
      </span>

      <div className="flex-1 h-px bg-white/10" />

    </div>
  </>
) : (
  <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10">

    <p className="text-sm font-semibold text-emerald-300">
      Google Account Verified
    </p>

    <p className="text-xs text-navy-300 mt-1">
      {googleRegistration.email}
    </p>

    <p className="text-xs text-navy-400 mt-3 leading-relaxed">
      Complete the remaining Rayjin Hardware customer information below.
      Your Google email is verified and cannot be changed during this registration.
    </p>

    <button
      type="button"
      onClick={cancelGoogleRegistration}
      className="mt-3 text-xs font-semibold text-construction-400 hover:text-construction-300 hover:underline"
    >
      Use email registration instead
    </button>

  </div>
)}

        {/* Error banner */}
        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-500/10 text-red-200 rounded-xl flex items-start gap-3 border border-red-500/20 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">

          {/* First + Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                First Name <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                placeholder="John"
              />
            </div>
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                Last Name <span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Username + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                Username <span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
                <input
                  type="text" name="username" required value={formData.username} onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                  placeholder="johndoe123"
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                Phone Number <span className="text-red-400 ml-0.5">*</span>
              </label>
              <div>
                <div className="relative flex">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
                  <span className={`flex items-center rounded-l-xl border border-r-0 bg-[#064633]/[0.90] pl-11 pr-3 text-sm font-bold text-emerald-100 ${
                    formData.phone_number && !phoneIsValid
                      ? 'border-red-500/60'
                      : phoneIsValid
                        ? 'border-emerald-400/60'
                        : 'border-white/10'
                  }`}>
                    +63
                  </span>
                  <input
                    type="tel"
                    name="phone_number"
                    required
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    pattern="9[0-9]{9}"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className={`min-w-0 flex-1 rounded-r-xl border bg-[#064633]/[0.68] px-4 py-3 text-white placeholder-navy-500 outline-none transition-all duration-200 ease-out focus:bg-[#064633]/[0.90] focus:ring-2 ${
                      formData.phone_number && !phoneIsValid
                        ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                        : phoneIsValid
                          ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20'
                          : 'border-white/10 hover:border-white/20 focus:border-construction-500 focus:ring-construction-500/20'
                    }`}
                    placeholder="9123456789"
                    aria-describedby="registration-phone-help"
                  />
                </div>
                <p
                  id="registration-phone-help"
                  className={`mt-1.5 text-[11px] ${
                    formData.phone_number && !phoneIsValid
                      ? 'text-red-300'
                      : phoneIsValid
                        ? 'text-emerald-300'
                        : 'text-navy-400'
                  }`}
                >
                  {phoneIsValid
                    ? 'Valid Philippine mobile number.'
                    : 'Enter 10 digits starting with 9 after +63 (example: 9123456789).'}
                </p>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="group">
            <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
              Email Address <span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
              <input
                type="email" name="email" required  readOnly={!!googleRegistration} value={formData.email} onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 focus:scale-[1.01] transition-all duration-200 ease-out outline-none"
                placeholder="john@example.com"
              />
            </div>
          </div>

<div className="group">
  <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5">
    Address <span className="text-red-400 ml-0.5">*</span>
  </label>

  <input
    type="text"
    name="address"
    required
    value={formData.address}
    onChange={handleChange}
    placeholder="House/Street, Barangay, Municipality"
    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20 outline-none"
  />
</div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                Password <span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
                <input
                  type={showPassword ? 'text' : 'password'} name="password" required
                  minLength={8}
                  value={formData.password} onChange={handleChange}
                  className={`w-full pl-11 pr-10 py-3 rounded-xl border bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:scale-[1.01] transition-all duration-200 ease-out outline-none ${
                    formData.password && !passwordIsStrong
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
                      : passwordIsStrong
                        ? 'border-emerald-400/60 focus:border-emerald-400 focus:ring-emerald-400/20'
                        : 'border-white/10 hover:border-white/20 focus:border-construction-500 focus:ring-construction-500/20'
                  }`}
                  placeholder="••••••••"
                  aria-describedby="password-requirements"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-construction-500 hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="group">
              <label className="block text-xs font-mono uppercase tracking-wider text-navy-300 mb-1.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-construction-500 opacity-60 group-focus-within:opacity-100 group-focus-within:animate-ping transition-all" />
                Confirm Password <span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400 group-focus-within:text-construction-500 transition-colors duration-200" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'} name="confirm_password" required
                  minLength={8}
                  value={formData.confirm_password} onChange={handleChange}
                  className={`w-full pl-11 pr-10 py-3 rounded-xl border ${
                    formData.password && formData.confirm_password && formData.password !== formData.confirm_password
                      ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-white/10 focus:ring-construction-500/20 focus:border-construction-500 hover:border-white/20'
                  } bg-[#064633]/[0.68] text-white placeholder-navy-500 focus:bg-[#064633]/[0.90] focus:ring-2 focus:scale-[1.01] transition-all duration-200 ease-out outline-none`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-400 hover:text-construction-500 hover:scale-110 active:scale-90 transition-all duration-150 focus:outline-none">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div id="password-requirements" className="rounded-xl border border-white/10 bg-[#043d2d]/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`text-xs font-bold ${
                  formData.password && !passwordIsStrong
                    ? 'text-red-300'
                    : passwordIsStrong
                      ? 'text-emerald-300'
                      : 'text-navy-200'
                }`}>
                  {passwordIsStrong ? 'Strong password accepted.' : 'Strong password required.'}
                </p>
                <p className="mt-1 text-[11px] text-navy-400">
                  Use all five requirements below. Validation updates while you type.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSuggestPassword}
                className="w-fit rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-400/15"
              >
                Suggest Strong Password
              </button>
            </div>

            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-5">
              {[
                ['8+ characters', passwordChecks.minimumLength],
                ['Uppercase', passwordChecks.uppercase],
                ['Lowercase', passwordChecks.lowercase],
                ['Number', passwordChecks.number],
                ['Special character', passwordChecks.special],
              ].map(([label, passed]) => (
                <div
                  key={String(label)}
                  className={`flex items-center gap-1.5 ${passed ? 'text-emerald-300' : 'text-navy-400'}`}
                >
                  {passed
                    ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />}
                  <span>{String(label)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit" disabled={status === 'loading'}
              className="w-full py-3 px-4 bg-gradient-to-r from-construction-500 via-construction-600 to-construction-500 hover:from-construction-400 hover:via-construction-500 hover:to-construction-400 text-navy-950 font-bold uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-construction-500/10 hover:shadow-construction-500/25 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {status === 'loading'
  ? googleRegistration
    ? 'Completing Account…'
    : 'Creating Account…'
  : googleRegistration
    ? 'Complete Google Registration'
    : 'Create Customer Account'}
            </button>
          </div>

          <p className="text-center text-sm text-navy-300 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-construction-400 hover:text-construction-300 hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
