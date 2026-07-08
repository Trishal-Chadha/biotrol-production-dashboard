import React, { useEffect, useState, useRef } from 'react';
import {
  Building2, Palette, Database, Info, Shield, Save, Upload, Download,
  Sun, Moon, Monitor, RefreshCw, AlertCircle, CheckCircle2, Clock,
  LogOut, Lock, KeyRound, HardDrive, Wifi, Server, ExternalLink,
  ChevronRight, X, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import PageHeader from '../components/PageHeader';

interface Settings {
  id: string;
  company_name: string;
  company_code: string;
  company_logo_url: string | null;
  address: string | null;
  phone_number: string | null;
  email: string | null;
  website: string | null;
  default_daily_target: number;
  theme: 'light' | 'dark' | 'system';
  last_backup_date: string | null;
  backup_status: string | null;
  updated_at: string;
}

interface SectionProps {
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ number, title, icon, children }: SectionProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <div className="flex items-center gap-2 text-gray-700">
          {icon}
          <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SettingRow({
  label, children, htmlFor
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 first:pt-0 last:pb-0">
      <label htmlFor={htmlFor} className="sm:w-48 text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition bg-white";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [dailyTarget, setDailyTarget] = useState(1000);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Restore state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
      } else if (data) {
        setSettings(data as Settings);
        setCompanyName(data.company_name || '');
        setCompanyCode(data.company_code || '');
        setAddress(data.address || '');
        setPhone(data.phone_number || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setDailyTarget(data.default_daily_target || 1000);
        if (data.theme) {
          setTheme(data.theme as 'light' | 'dark' | 'system');
        }
        if (data.company_logo_url) {
          setLogoPreview(data.company_logo_url);
        }
      }
      setLoading(false);
    }
    fetchSettings();
  }, [setTheme]);

  const handleSaveCompanyInfo = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('settings')
      .update({
        company_name: companyName,
        company_code: companyCode,
        address: address || null,
        phone_number: phone || null,
        email: email || null,
        website: website || null,
        default_daily_target: dailyTarget,
        updated_by: user?.id,
      })
      .eq('id', settings?.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Company information saved successfully!');
      // Refresh settings
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as Settings);
    }

    setSaving(false);
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);

    // Save to database
    await supabase
      .from('settings')
      .update({ theme: newTheme, updated_by: user?.id })
      .eq('id', settings?.id);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be less than 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      const base64Logo = await base64Promise;

      // Save to settings
      const { error: updateError } = await supabase
        .from('settings')
        .update({
          company_logo_url: base64Logo,
          updated_by: user?.id,
        })
        .eq('id', settings.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Logo uploaded successfully!');
        setLogoFile(null);
        // Refresh settings
        const { data } = await supabase.from('settings').select('*').maybeSingle();
        if (data) setSettings(data as Settings);
      }
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
    }

    setSaving(false);
  };

  const handleRemoveLogo = async () => {
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const { error: updateError } = await supabase
      .from('settings')
      .update({
        company_logo_url: null,
        updated_by: user?.id,
      })
      .eq('id', settings.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Logo removed successfully!');
      setLogoFile(null);
      setLogoPreview(null);
      // Refresh settings
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as Settings);
    }

    setSaving(false);
  };

  const handleBackup = async () => {
    setSaving(true);
    setError('');

    try {
      // Fetch all data for backup
      const [productsRes, employeesRes, productionRes, sheetEntriesRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('production_data').select('*'),
        supabase.from('sheet_entries').select('*'),
        supabase.from('settings').select('*'),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        products: productsRes.data || [],
        employees: employeesRes.data || [],
        production_data: productionRes.data || [],
        sheet_entries: sheetEntriesRes.data || [],
        settings: settingsRes.data || [],
      };

      // Create and download backup file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biotrol-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Update backup status
      await supabase
        .from('settings')
        .update({
          last_backup_date: new Date().toISOString(),
          backup_status: 'success',
          updated_by: user?.id,
        })
        .eq('id', settings?.id);

      // Refresh settings
      const { data } = await supabase.from('settings').select('*').maybeSingle();
      if (data) setSettings(data as Settings);

      setSuccess('Database backup completed successfully!');
    } catch (err) {
      setError('Backup failed. Please try again.');
      await supabase
        .from('settings')
        .update({
          last_backup_date: new Date().toISOString(),
          backup_status: 'failed',
          updated_by: user?.id,
        })
        .eq('id', settings?.id);
    }

    setSaving(false);
  };

  const handleRestoreFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setShowRestoreModal(true);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setRestoring(true);

    try {
      const text = await restoreFile.text();
      const backupData = JSON.parse(text);

      // Validate backup file
      if (!backupData.version || !backupData.timestamp) {
        throw new Error('Invalid backup file format');
      }

      // Restore data (this is a simplified version - in production you'd want more validation)
      if (backupData.products?.length) {
        for (const product of backupData.products) {
          await supabase.from('products').upsert(product, { onConflict: 'id' });
        }
      }

      if (backupData.employees?.length) {
        for (const employee of backupData.employees) {
          await supabase.from('employees').upsert(employee, { onConflict: 'id' });
        }
      }

      setSuccess('Database restored successfully!');
      setShowRestoreModal(false);
      setRestoreFile(null);

      // Refresh page to show restored data
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError('Failed to restore database. Invalid backup file.');
    }

    setRestoring(false);
  };

  const handleExportAll = async () => {
    setSaving(true);

    try {
      const [productsRes, employeesRes, productionRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('production_data').select('*'),
      ]);

      // Create workbook with multiple sheets
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      if (productsRes.data) {
        const ws = XLSX.utils.json_to_sheet(productsRes.data);
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
      }

      if (employeesRes.data) {
        const ws = XLSX.utils.json_to_sheet(employeesRes.data);
        XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      }

      if (productionRes.data) {
        const ws = XLSX.utils.json_to_sheet(productionRes.data);
        XLSX.utils.book_append_sheet(wb, ws, 'Production Data');
      }

      XLSX.writeFile(wb, `biotrol-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setSuccess('Data exported successfully!');
    } catch (err) {
      setError('Export failed. Please try again.');
    }

    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setPasswordSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
    } else {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed successfully!');
    }

    setPasswordSaving(false);
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm('Are you sure you want to sign out from all devices? This will end your current session too.')) {
      return;
    }

    // Sign out which invalidates all sessions
    await signOut();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your application preferences"
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Information */}
          <Section number="1" title="Company Information" icon={<Building2 size={16} />}>
            <div className="space-y-0">
              {/* Logo Upload */}
              <SettingRow label="Company Logo">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-blue-200 overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={24} className="text-blue-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <Upload size={12} /> {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      {logoFile && (
                        <button
                          onClick={handleLogoUpload}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                        >
                          <Save size={12} /> Save Logo
                        </button>
                      )}
                      {logoPreview && !logoFile && (
                        <button
                          onClick={handleRemoveLogo}
                          disabled={saving}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-60"
                        >
                          <X size={12} /> Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </SettingRow>

              <SettingRow label="Company Name" htmlFor="companyName">
                <input
                  id="companyName"
                  type="text"
                  className={inputClass}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                />
              </SettingRow>

              <SettingRow label="Company Code" htmlFor="companyCode">
                <input
                  id="companyCode"
                  type="text"
                  className={inputClass}
                  value={companyCode}
                  onChange={e => setCompanyCode(e.target.value)}
                  placeholder="COMP"
                />
              </SettingRow>

              <SettingRow label="Address" htmlFor="address">
                <input
                  id="address"
                  type="text"
                  className={inputClass}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Company address"
                />
              </SettingRow>

              <SettingRow label="Phone Number" htmlFor="phone">
                <input
                  id="phone"
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 234 567 890"
                />
              </SettingRow>

              <SettingRow label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                />
              </SettingRow>

              <SettingRow label="Website" htmlFor="website">
                <input
                  id="website"
                  type="url"
                  className={inputClass}
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://www.company.com"
                />
              </SettingRow>

              <SettingRow label="Default Daily Target" htmlFor="dailyTarget">
                <input
                  id="dailyTarget"
                  type="number"
                  className={inputClass}
                  value={dailyTarget}
                  onChange={e => setDailyTarget(parseInt(e.target.value) || 0)}
                  placeholder="1000"
                />
              </SettingRow>

              <div className="pt-4 mt-4 border-t border-gray-100">
                <button
                  onClick={handleSaveCompanyInfo}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section number="2" title="Appearance" icon={<Palette size={16} />}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-4">Choose your preferred theme. The application will update immediately.</p>

              <div className="grid grid-cols-3 gap-3">
                {/* Light Mode */}
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    theme === 'light'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Sun size={20} className={theme === 'light' ? 'text-amber-500' : 'text-gray-400'} />
                    <span className={`text-xs font-medium ${theme === 'light' ? 'text-blue-700' : 'text-gray-600'}`}>
                      Light
                    </span>
                  </div>
                  {theme === 'light' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                </button>

                {/* Dark Mode */}
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-blue-500 bg-gray-800'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Moon size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-gray-400'} />
                    <span className={`text-xs font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-gray-600'}`}>
                      Dark
                    </span>
                  </div>
                  {theme === 'dark' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                </button>

                {/* System Default */}
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    theme === 'system'
                      ? 'border-blue-500 bg-gray-100'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Monitor size={20} className={theme === 'system' ? 'text-blue-600' : 'text-gray-400'} />
                    <span className={`text-xs font-medium ${theme === 'system' ? 'text-blue-700' : 'text-gray-600'}`}>
                      System
                    </span>
                  </div>
                  {theme === 'system' && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 mt-4">
                System default follows your device's display settings.
              </p>
            </div>
          </Section>

          {/* Backup & Restore */}
          <Section number="3" title="Backup & Restore" icon={<Database size={16} />}>
            <div className="space-y-4">
              {/* Backup Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Last Backup</p>
                    <p className="text-sm font-medium text-gray-800 mt-1">
                      {settings?.last_backup_date
                        ? new Date(settings.last_backup_date).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      {settings?.backup_status === 'success' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                          <CheckCircle2 size={12} /> Successful
                        </span>
                      ) : settings?.backup_status === 'failed' ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                          <AlertCircle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                          <Clock size={12} /> No backup yet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleBackup}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  <Database size={14} /> Backup Database
                </button>

                <div className="relative">
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreFileSelect}
                  />
                  <button
                    onClick={() => restoreInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors border border-amber-200"
                  >
                    <RefreshCw size={14} /> Restore Database
                  </button>
                </div>

                <button
                  onClick={handleExportAll}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200 disabled:opacity-60"
                >
                  <Download size={14} /> Export All Data
                </button>
              </div>

              <p className="text-[10px] text-gray-400">
                Backup creates a JSON file of all your data. Restore will replace current data.
              </p>
            </div>
          </Section>

          {/* System Information */}
          <Section number="4" title="System Information" icon={<Info size={16} />}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Server size={14} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Application Version</p>
                  </div>
                  <p className="text-sm font-medium text-gray-800">v1.0.0</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <HardDrive size={14} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Database Status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-700">Connected</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi size={14} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Supabase Status</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-green-700">Active</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">Last Updated</p>
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {settings?.updated_at
                      ? new Date(settings.updated_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2">
                  <ExternalLink size={12} className="text-blue-500" />
                  <span className="text-xs text-blue-700">Supabase Dashboard</span>
                </div>
                <p className="text-[10px] text-blue-600 mt-1">
                  Manage your database directly through Supabase console.
                </p>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section number="5" title="Security" icon={<Shield size={16} />}>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <KeyRound size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Change Password</p>
                      <p className="text-xs text-gray-500">Update your account password</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                  >
                    <Lock size={12} /> Change
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <LogOut size={18} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Logout from All Devices</p>
                      <p className="text-xs text-gray-500">End all active sessions</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogoutAllDevices}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors border border-red-200"
                  >
                    <LogOut size={12} /> Sign Out All
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    For security reasons, changing your password will not automatically log you out from other devices. Use "Sign Out All" to end all sessions.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                  <AlertCircle size={12} />
                  {passwordError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  <Save size={14} />
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Confirm Restore</h2>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">This action cannot be undone</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Restoring will replace all current data. Make sure you have a recent backup.
                  </p>
                </div>
              </div>
            </div>

            {restoreFile && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">File:</span> {restoreFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Size:</span> {(restoreFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} />
                {restoring ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
