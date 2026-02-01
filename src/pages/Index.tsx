import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { UploadCard } from "@/components/landing/UploadCard";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Zap,
    title: "Instant Analysis",
    description: "Get damage assessments in under 10 seconds",
  },
  {
    icon: Target,
    title: "98.5% Accuracy",
    description: "Enterprise-grade AI trained on 10M+ claims",
  },
  {
    icon: Clock,
    title: "70% Faster Claims",
    description: "Reduce processing time from days to minutes",
  },
  {
    icon: Shield,
    title: "Fraud Detection",
    description: "Built-in anomaly detection and verification",
  },
];

const stats = [
  { value: "2.5M+", label: "Claims Processed" },
  { value: "98.5%", label: "Accuracy Rate" },
  { value: "<10s", label: "Avg. Analysis Time" },
  { value: "₹500Cr+", label: "Payouts Calculated" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-navy-500/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 data-grid opacity-20" />
        </div>

        {/* Header */}
        <header className="relative z-10 w-full py-6 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground">
                AutoGuard AI
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#demo"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Demo
              </a>
              <a
                href="#pricing"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
              <Button
                onClick={() => navigate("/dashboard")}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Open Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center py-12 px-8">
          <div className="max-w-7xl mx-auto w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text & Upload */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Enterprise AI Platform
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
                >
                  AI-Powered Claims,{" "}
                  <span className="gradient-text-emerald">
                    Decided in Seconds
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg text-muted-foreground max-w-xl"
                >
                  Transform your claims processing with computer vision that
                  detects vehicle damage, estimates repair costs, and automates
                  payouts—all in real-time.
                </motion.p>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-6"
                >
                  {stats.map((stat, i) => (
                    <div key={i} className="text-center md:text-left">
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </motion.div>

                {/* Upload Card */}
                <UploadCard className="max-w-md" />
              </div>

              {/* Right Column - Live Demo */}
              <div className="hidden lg:block" id="demo">
                <LiveDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Leading Insurers Choose AutoGuard
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI platform processes claims faster, more accurately, and at a
              fraction of the cost of traditional methods.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={cn(
                    "p-6 rounded-2xl bg-card border border-border",
                    "hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10",
                    "transition-all duration-300 group"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-12 rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 border border-navy-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
            <div className="relative z-10">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Claims Process?
              </h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                Join 200+ Indian workshops and insurers already using AutoGuard AI to
                process lakhs of claims faster and more accurately.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                >
                  Try Demo Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  Schedule Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">AutoGuard AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 AutoGuard AI. Enterprise vehicle damage assessment platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
