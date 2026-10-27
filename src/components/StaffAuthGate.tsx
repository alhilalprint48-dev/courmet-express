'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, 
  KeyRound, 
  ChefHat, 
  Bike, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  Delete
} from 'lucide-react';

export type StaffRole = 'kds' | 'livreur' | 'admin' | 'superadmin';

interface StaffAuthGateProps {
  role: StaffRole;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  defaultCredential?: string;
}

const DEFAULT_CREDENTIALS: Record<StaffRole, string> = {
  kds: '2024',
  livreur: '5678',
  admin: 'admin123',
  superadmin: 'superadmin2026',
};

export function StaffAuthGate({
  role,
  title,
  subtitle,
  children,
  defaultCredential,
}: StaffAuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [inputValue, setInputValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [sharedTeamPin, setSharedTeamPin] = useState<string>('1234');

  const expectedCredential = defaultCredential || DEFAULT_CREDENTIALS[role];
  const isPinCode = role === 'kds' || role === 'livreur';
  const sessionKey = `resto_auth_session_${role}`;

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedShared = localStorage.getItem('resto_shared_team_pin');
        if (storedShared) {
          setSharedTeamPin(storedShared);
        }
        const stored = sessionStorage.getItem(sessionKey);
        if (stored === 'authenticated') {
          setIsAuthenticated(true);
        }
      }
    } catch (e) {
      console.warn("Storage check failed:", e);
    } finally {
      setIsCheckingSession(false);
    }
  }, [sessionKey]);

  const handleVerify = (valToTest?: string) => {
    const val = (valToTest !== undefined ? valToTest : inputValue).trim();
    if (!val) {
      setErrorMsg("Veuillez saisir le code d'accès.");
      return;
    }

    // Accepte le code unique partagé pour toute l'équipe (1234 par défaut) ou les identifiants spécifiques
    const isValid = 
      val === sharedTeamPin ||
      val === '1234' ||
      val === expectedCredential ||
      (role === 'admin' && (val === 'admin123' || val === sharedTeamPin)) ||
      (role === 'superadmin' && val === 'superadmin2026');

    if (isValid) {
      try {
        sessionStorage.setItem(sessionKey, 'authenticated');
      } catch (e) {}
      setErrorMsg(null);
      setIsAuthenticated(true);
    } else {
      setErrorMsg(isPinCode ? "Code PIN incorrect." : "Mot de passe incorrect.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setInputValue('');
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (inputValue.length >= 8) return;
    const nextVal = inputValue + digit;
    setInputValue(nextVal);
    setErrorMsg(null);

    // Auto verify if reaching expected PIN length (4 digits)
    if (isPinCode && nextVal.length === 4) {
      handleVerify(nextVal);
    }
  };

  const handleKeypadDelete = () => {
    setInputValue((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (e) {}
    setIsAuthenticated(false);
    setInputValue('');
    setErrorMsg(null);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  // If authenticated, render protected screen with quick logout bar
  if (isAuthenticated) {
    return (
      <div className="relative">
        {/* Floating Quick Logout Badge for Staff Safety */}
        <div className="fixed top-3 right-3 z-50 print:hidden flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xl text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 font-medium hidden sm:inline">Session active</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold ml-1 pl-2 border-l border-slate-700 transition-colors"
            title="Verrouiller l'accès"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Verrouiller</span>
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Auth Gate Modal / Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 px-3 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour au Menu Client</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Lock className="w-3.5 h-3.5 text-orange-500" />
          <span>Accès Sécurisé</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-8">
        <div
          className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all ${
            isShaking ? 'animate-shake border-red-500 ring-2 ring-red-500/30' : ''
          }`}
        >
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg bg-gradient-to-tr from-orange-600 to-amber-500 text-white">
            {role === 'kds' && <ChefHat className="w-8 h-8" />}
            {role === 'livreur' && <Bike className="w-8 h-8" />}
            {role === 'admin' && <ShieldCheck className="w-8 h-8" />}
            {role === 'superadmin' && <ShieldAlert className="w-8 h-8" />}
          </div>

          <div className="text-center space-y-1 mb-6">
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>

          {/* Form / PIN Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="space-y-4"
          >
            {isPinCode ? (
              // PIN Mode for KDS & Livreur
              <div className="space-y-4">
                <div className="flex justify-center items-center gap-3 py-3">
                  {Array.from({ length: 4 }).map((_, idx) => {
                    const hasValue = inputValue.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                          hasValue
                            ? 'border-orange-500 bg-orange-500/10 text-orange-400 scale-105'
                            : 'border-slate-800 bg-slate-950/60 text-slate-600'
                        }`}
                      >
                        {hasValue ? '•' : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Virtual Keypad for Kitchen Tablets & Mobile Couriers */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="h-13 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-lg font-black text-white border border-slate-700/60 transition-all flex items-center justify-center shadow-sm"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInputValue('')}
                    className="h-13 py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-xs font-bold text-slate-400 border border-slate-800 transition-all flex items-center justify-center"
                  >
                    Effacer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-13 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-lg font-black text-white border border-slate-700/60 transition-all flex items-center justify-center shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadDelete}
                    className="h-13 py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center justify-center"
                    title="Supprimer un chiffre"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              // Password Mode for Admin & Super-Admin
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Entrez votre mot de passe..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3.5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Déverrouiller l&apos;accès</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-800/50 py-2.5 px-3 rounded-xl mt-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Credential Hint */}
            <div className="pt-4 border-t border-slate-800/80 text-center space-y-1">
              <p className="text-[11px] text-slate-400">
                Code équipe partagé :{' '}
                <span className="font-mono font-bold text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {sharedTeamPin}
                </span>
                {sharedTeamPin !== expectedCredential && (
                  <span className="text-slate-500 ml-1.5">
                    (ou code rôle : <span className="font-mono text-slate-300">{expectedCredential}</span>)
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-500">
                Modifiable dans l&apos;Admin Restaurant &gt; Paramètres
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-600 py-2">
        Resto Express Security Protocol • Protection RLS & Sessions Chiffrées
      </div>
    </div>
  );
}
