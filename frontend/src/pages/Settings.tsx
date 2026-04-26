import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Save,
  CheckCircle,
  Brain,
  ShieldCheck,
  Car,
  MapPin,
  Phone,
  Mail,
  Building2,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
  "Hyderabad", "Pune", "Ahmedabad", "Noida", "Gurgaon",
  "Nagpur", "Jaipur", "Lucknow", "Chandigarh", "Other",
];

// ── Reusable toggle row ───────────────────────────────────────────────────
function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  accent = "emerald",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 shrink-0",
          checked ? `bg-${accent}-500/10` : "bg-muted/50"
        )}>
          <Icon className={cn("w-4 h-4", checked ? `text-${accent}-500` : "text-muted-foreground")} />
        </div>
        <div>
          <p className="font-medium text-foreground text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── System status pill ───────────────────────────────────────────────────
function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border",
      active
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        : "bg-muted/50 text-muted-foreground border-border"
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
      )} />
      {label}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function Settings() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    company: "AutoGuard AI",
    phone: "",
    role: "Claims Adjuster",
  });

  const [notifications, setNotifications] = useState({
    claimApproved: true,
    claimRejected: true,
    newAnalysisReady: true,
    highSeverityAlert: true,
    weeklyDigest: false,
  });

  const [aiPrefs, setAiPrefs] = useState({
    autoApproveBelow: 5000,       // auto-approve if total cost < ₹5,000
    preferredCity: "Mumbai",
    defaultFuelType: "Petrol",
    defaultPolicyType: "standard", // "zero-dep" | "standard"
    flagFraudAbove: 80,            // flag if fraud confidence > 80%
    requireManualReview: true,     // always require manual review for severe
  });

  const handleSaveProfile = () => toast.success("Profile saved successfully!");
  const handleSaveNotifications = () => toast.success("Notification preferences updated!");
  const handleSaveAiPrefs = () => toast.success("AI analysis preferences saved!");

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <SettingsIcon className="w-6 h-6 text-emerald-500" />
                </div>
                Settings
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your adjuster profile and claim preferences
              </p>
            </div>

            {/* System status badges */}
            <div className="flex flex-wrap gap-2">
              <StatusPill label="AI Engine Online" active={true} />
              <StatusPill label="Database Connected" active={true} />
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-muted/50 h-auto p-1 gap-1">
              <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-background">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2 data-[state=active]:bg-background">
                <Brain className="w-4 h-4" />
                AI Preferences
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-background">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
            </TabsList>

            {/* ── PROFILE TAB ─────────────────────────────────────────── */}
            <TabsContent value="profile">
              <div className="grid lg:grid-cols-3 gap-6">

                {/* Avatar / Role card */}
                <Card className="lg:col-span-1 border-border">
                  <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-2 border-emerald-500/30 flex items-center justify-center"
                    >
                      <User className="w-12 h-12 text-emerald-500" />
                    </motion.div>

                    <div>
                      <p className="font-bold text-lg text-foreground">
                        {profile.name || "Your Name"}
                      </p>
                      <p className="text-sm text-muted-foreground">{profile.role}</p>
                      <Badge variant="outline" className="mt-2 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Verified Adjuster
                      </Badge>
                    </div>

                    <div className="w-full pt-2 border-t border-border space-y-2 text-left">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5" />
                        {profile.company}
                      </div>
                      {profile.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          {profile.email}
                        </div>
                      )}
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          {profile.phone}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Form card */}
                <Card className="lg:col-span-2 border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="w-4 h-4 text-emerald-500" />
                      Adjuster Information
                    </CardTitle>
                    <CardDescription>
                      Your details appear on generated claim reports
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g. Mohit Jeswani"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="adjuster@company.com"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company / Insurer</Label>
                        <Input
                          id="company"
                          placeholder="e.g. AutoGuard India Pvt Ltd"
                          value={profile.company}
                          onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="+91 98765 43210"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={profile.role}
                        onValueChange={(v) => setProfile({ ...profile, role: v })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Claims Adjuster">Claims Adjuster</SelectItem>
                          <SelectItem value="Senior Adjuster">Senior Adjuster</SelectItem>
                          <SelectItem value="Team Lead">Team Lead</SelectItem>
                          <SelectItem value="Surveyor">Surveyor</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveProfile}
                        className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        <Save className="w-4 h-4" />
                        Save Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── AI PREFERENCES TAB ──────────────────────────────────── */}
            <TabsContent value="ai">
              <div className="grid lg:grid-cols-2 gap-6">

                {/* Claim thresholds */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                      Claim Thresholds
                    </CardTitle>
                    <CardDescription>
                      Control AI-assisted decision boundaries
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Auto-approve threshold */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Auto-Approve Below
                        </Label>
                        <span className="text-sm font-bold text-emerald-500">
                          ₹{aiPrefs.autoApproveBelow.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <Slider
                        value={[aiPrefs.autoApproveBelow]}
                        onValueChange={([v]) => setAiPrefs({ ...aiPrefs, autoApproveBelow: v })}
                        min={0}
                        max={50000}
                        step={500}
                        className="py-1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Claims below this estimated cost can be fast-tracked for approval
                      </p>
                    </div>

                    {/* Fraud flag threshold */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Fraud Flag Sensitivity
                        </Label>
                        <span className="text-sm font-bold text-amber-500">
                          {aiPrefs.flagFraudAbove}%
                        </span>
                      </div>
                      <Slider
                        value={[aiPrefs.flagFraudAbove]}
                        onValueChange={([v]) => setAiPrefs({ ...aiPrefs, flagFraudAbove: v })}
                        min={50}
                        max={95}
                        step={5}
                        className="py-1"
                      />
                      <p className="text-xs text-muted-foreground">
                        AI will flag claims when fraud confidence exceeds this threshold
                      </p>
                    </div>

                    {/* Manual review toggle */}
                    <ToggleRow
                      icon={ShieldCheck}
                      title="Always Review Severe Damage"
                      description="Require manual adjuster approval for severe claims regardless of cost"
                      checked={aiPrefs.requireManualReview}
                      onChange={(v) => setAiPrefs({ ...aiPrefs, requireManualReview: v })}
                    />
                  </CardContent>
                </Card>

                {/* Default claim context */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Car className="w-4 h-4 text-blue-500" />
                      Default Claim Context
                    </CardTitle>
                    <CardDescription>
                      Pre-fill these values in the insurance form for faster processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        Default Operating City
                      </Label>
                      <Select
                        value={aiPrefs.preferredCity}
                        onValueChange={(v) => setAiPrefs({ ...aiPrefs, preferredCity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CITIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Fuel Type</Label>
                      <Select
                        value={aiPrefs.defaultFuelType}
                        onValueChange={(v) => setAiPrefs({ ...aiPrefs, defaultFuelType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Petrol", "Diesel", "CNG", "Electric", "Hybrid"].map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Policy Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "zero-dep", label: "Zero-Dep", desc: "Full coverage" },
                          { value: "standard", label: "Standard", desc: "40% dep. applied" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setAiPrefs({ ...aiPrefs, defaultPolicyType: opt.value })}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all",
                              aiPrefs.defaultPolicyType === opt.value
                                ? "border-emerald-500/50 bg-emerald-500/10"
                                : "border-border bg-muted/20 hover:bg-muted/40"
                            )}
                          >
                            <p className={cn(
                              "text-sm font-semibold",
                              aiPrefs.defaultPolicyType === opt.value
                                ? "text-emerald-600"
                                : "text-foreground"
                            )}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Info note */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      These defaults pre-fill the insurance form but can always be changed per claim
                    </div>
                  </CardContent>
                </Card>

                {/* Save button full width */}
                <div className="lg:col-span-2 flex justify-end">
                  <Button
                    onClick={handleSaveAiPrefs}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Save className="w-4 h-4" />
                    Save AI Preferences
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ── NOTIFICATIONS TAB ───────────────────────────────────── */}
            <TabsContent value="notifications">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose which claim events trigger alerts during your session
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ToggleRow
                    icon={CheckCircle}
                    title="Claim Approved"
                    description="Show alert when a claim is marked as approved"
                    checked={notifications.claimApproved}
                    onChange={(v) => setNotifications({ ...notifications, claimApproved: v })}
                    accent="emerald"
                  />
                  <ToggleRow
                    icon={Bell}
                    title="Claim Rejected"
                    description="Show alert when a claim is rejected"
                    checked={notifications.claimRejected}
                    onChange={(v) => setNotifications({ ...notifications, claimRejected: v })}
                    accent="red"
                  />
                  <ToggleRow
                    icon={Brain}
                    title="AI Analysis Ready"
                    description="Notify when AI damage assessment completes"
                    checked={notifications.newAnalysisReady}
                    onChange={(v) => setNotifications({ ...notifications, newAnalysisReady: v })}
                    accent="blue"
                  />
                  <ToggleRow
                    icon={ShieldCheck}
                    title="High Severity Alert"
                    description="Immediate alert for severe vehicle damage detected"
                    checked={notifications.highSeverityAlert}
                    onChange={(v) => setNotifications({ ...notifications, highSeverityAlert: v })}
                    accent="amber"
                  />
                  <ToggleRow
                    icon={SlidersHorizontal}
                    title="Weekly Claims Digest"
                    description="Receive a weekly summary of claims processed"
                    checked={notifications.weeklyDigest}
                    onChange={(v) => setNotifications({ ...notifications, weeklyDigest: v })}
                    accent="emerald"
                  />

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveNotifications}
                      className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </motion.div>
      </div>
    </AppLayout>
  );
}
