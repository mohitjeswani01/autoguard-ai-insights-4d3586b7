import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const monthlyClaimsData = [
  { month: "Jan", claims: 145, approved: 120, rejected: 15 },
  { month: "Feb", claims: 162, approved: 138, rejected: 12 },
  { month: "Mar", claims: 178, approved: 155, rejected: 18 },
  { month: "Apr", claims: 156, approved: 130, rejected: 20 },
  { month: "May", claims: 189, approved: 165, rejected: 14 },
  { month: "Jun", claims: 201, approved: 178, rejected: 16 },
  { month: "Jul", claims: 215, approved: 190, rejected: 15 },
  { month: "Aug", claims: 198, approved: 172, rejected: 18 },
  { month: "Sep", claims: 223, approved: 195, rejected: 20 },
  { month: "Oct", claims: 245, approved: 218, rejected: 17 },
  { month: "Nov", claims: 232, approved: 205, rejected: 19 },
  { month: "Dec", claims: 256, approved: 228, rejected: 18 },
];

const payoutTrendsData = [
  { month: "Jan", payout: 1250000 },
  { month: "Feb", payout: 1380000 },
  { month: "Mar", payout: 1520000 },
  { month: "Apr", payout: 1340000 },
  { month: "May", payout: 1650000 },
  { month: "Jun", payout: 1780000 },
  { month: "Jul", payout: 1920000 },
  { month: "Aug", payout: 1750000 },
  { month: "Sep", payout: 2050000 },
  { month: "Oct", payout: 2280000 },
  { month: "Nov", payout: 2150000 },
  { month: "Dec", payout: 2420000 },
];

const damageTypeData = [
  { name: "Dent", value: 35, color: "#10b981" },
  { name: "Scratch", value: 28, color: "#3b82f6" },
  { name: "Crack", value: 18, color: "#f59e0b" },
  { name: "Shatter", value: 12, color: "#ef4444" },
  { name: "Other", value: 7, color: "#8b5cf6" },
];

const severityDistribution = [
  { name: "Minor", value: 45, color: "#10b981" },
  { name: "Moderate", value: 35, color: "#f59e0b" },
  { name: "Severe", value: 20, color: "#ef4444" },
];

export default function Analytics() {
  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Claims performance and damage insights
              </p>
            </div>
            <Select defaultValue="2024">
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Claims (YTD)</p>
              <p className="text-2xl font-bold text-foreground mt-1">2,400</p>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+18% vs last year</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Payouts (YTD)</p>
              <p className="text-2xl font-bold text-foreground mt-1">₹2.15 Cr</p>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+24% vs last year</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approval Rate</p>
              <p className="text-2xl font-bold text-foreground mt-1">87.5%</p>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>+2.3% improvement</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Processing Time</p>
              <p className="text-2xl font-bold text-foreground mt-1">8.2s</p>
              <div className="flex items-center gap-1 text-xs text-destructive mt-2">
                <TrendingDown className="w-3 h-3" />
                <span>-15% faster</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Claims Trend */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  Monthly Claim Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyClaimsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="approved" 
                        name="Approved"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                      />
                      <Bar 
                        dataKey="rejected" 
                        name="Rejected"
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Payout Trends */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Payout Trends (₹)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payoutTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`₹${(value / 100000).toFixed(1)} Lakhs`, "Payout"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="payout"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#10b981" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Damage Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-500" />
                  Damage Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={damageTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {damageTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Severity Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-500" />
                  Severity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={severityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
