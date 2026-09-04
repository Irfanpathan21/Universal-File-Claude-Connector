/**
 * PasswordInput — Password field with show/hide toggle and strength indicator
 * Used by: password_protect, protect_workbook
 */
import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw, Lock } from 'lucide-react';

interface PasswordInputProps {
  value: string;
  onChange: (password: string) => void;
  accentColor?: string;
}

function getStrength(password: string): { label: string; color: string; width: string } {
  if (!password || password.length < 4) return { label: 'Weak', color: '#ef4444', width: '25%' };
  if (password.length < 8) return { label: 'Fair', color: '#f59e0b', width: '50%' };
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasNumber, hasSpecial, password.length >= 12].filter(Boolean).length;
  if (score >= 3) return { label: 'Strong', color: '#22c55e', width: '100%' };
  return { label: 'Good', color: '#3b82f6', width: '75%' };
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export function PasswordInput({ value, onChange, accentColor = '#004ac6' }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const strength = getStrength(value);

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-[#191b23] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
        <Lock size={14} style={{ color: accentColor }} /> Password
      </label>

      {/* Input field */}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a strong password"
          className="w-full px-3 py-2.5 pr-20 rounded-xl bg-[#f3f3fe] dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700 text-sm font-semibold text-[#191b23] dark:text-white placeholder-[#737686]"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="p-1.5 rounded-lg text-[#737686] hover:text-[#191b23] dark:hover:text-white cursor-pointer"
            title={show ? 'Hide' : 'Show'}
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="button"
            onClick={() => onChange(generatePassword())}
            className="p-1.5 rounded-lg text-[#737686] hover:text-[#191b23] dark:hover:text-white cursor-pointer"
            title="Generate random password"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Strength indicator */}
      {value && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-[#e1e2ed] dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: strength.width, backgroundColor: strength.color }}
            />
          </div>
          <div className="text-[10px] font-bold" style={{ color: strength.color }}>
            {strength.label} password
          </div>
        </div>
      )}
    </div>
  );
}
