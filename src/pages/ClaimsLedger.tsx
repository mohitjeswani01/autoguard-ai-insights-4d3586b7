import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

interface Claim {
  id: string;
  claimNumber: string;
  vehiclePlate: string;
  vehicleModel: string;
  date: string;
  aiConfidence: number;
  status: "pending" | "processing" | "approved" | "rejected" | "under_review";
  payout: number;
}

const mockClaims: Claim[] = [
  {
    id: "1",
    claimNumber: "CLM-2024-001234",
    vehiclePlate: "ABC 1234",
    vehicleModel: "BMW 5 Series",
    date: "2024-01-15",
    aiConfidence: 94,
    status: "approved",
    payout: 4250,
  },
  {
    id: "2",
    claimNumber: "CLM-2024-001235",
    vehiclePlate: "XYZ 5678",
    vehicleModel: "Mercedes C-Class",
    date: "2024-01-15",
    aiConfidence: 87,
    status: "processing",
    payout: 3100,
  },
  {
    id: "3",
    claimNumber: "CLM-2024-001236",
    vehiclePlate: "DEF 9012",
    vehicleModel: "Audi A4",
    date: "2024-01-14",
    aiConfidence: 72,
    status: "under_review",
    payout: 5800,
  },
  {
    id: "4",
    claimNumber: "CLM-2024-001237",
    vehiclePlate: "GHI 3456",
    vehicleModel: "Tesla Model 3",
    date: "2024-01-14",
    aiConfidence: 96,
    status: "approved",
    payout: 2200,
  },
  {
    id: "5",
    claimNumber: "CLM-2024-001238",
    vehiclePlate: "JKL 7890",
    vehicleModel: "Ford F-150",
    date: "2024-01-13",
    aiConfidence: 45,
    status: "rejected",
    payout: 0,
  },
  {
    id: "6",
    claimNumber: "CLM-2024-001239",
    vehiclePlate: "MNO 2345",
    vehicleModel: "Honda Civic",
    date: "2024-01-13",
    aiConfidence: 91,
    status: "pending",
    payout: 1850,
  },
  {
    id: "7",
    claimNumber: "CLM-2024-001240",
    vehiclePlate: "PQR 6789",
    vehicleModel: "Toyota Camry",
    date: "2024-01-12",
    aiConfidence: 88,
    status: "approved",
    payout: 3400,
  },
  {
    id: "8",
    claimNumber: "CLM-2024-001241",
    vehiclePlate: "STU 0123",
    vehicleModel: "Chevrolet Malibu",
    date: "2024-01-12",
    aiConfidence: 83,
    status: "processing",
    payout: 2900,
  },
];

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  },
  processing: {
    label: "Processing",
    icon: RefreshCw,
    className: "bg-primary/10 text-primary",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
  under_review: {
    label: "Under Review",
    icon: AlertCircle,
    className: "bg-warning/10 text-warning",
  },
};

type SortField = "date" | "aiConfidence" | "payout";
type SortDirection = "asc" | "desc";

export default function ClaimsLedger() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedClaims = useMemo(() => {
    let result = [...mockClaims];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (claim) =>
          claim.claimNumber.toLowerCase().includes(query) ||
          claim.vehiclePlate.toLowerCase().includes(query) ||
          claim.vehicleModel.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((claim) => claim.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "aiConfidence":
          comparison = a.aiConfidence - b.aiConfidence;
          break;
        case "payout":
          comparison = a.payout - b.payout;
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });

    return result;
  }, [searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? (
      <ChevronDown className="w-4 h-4 ml-1" />
    ) : (
      <ChevronUp className="w-4 h-4 ml-1" />
    );
  };

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
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Fleet Claims Ledger
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage and track all vehicle damage claims
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Calendar className="w-4 h-4" />
                New Claim
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Total Claims", value: "156", change: "+12 this week" },
            { label: "Pending", value: "23", change: "Avg 2.3 days" },
            { label: "Approved Today", value: "8", change: "$34,200 paid" },
            { label: "Avg AI Confidence", value: "91%", change: "+3% vs last month" },
          ].map((stat, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-card border border-border"
            >
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search claims, plates, or vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Claim ID</TableHead>
                <TableHead className="font-semibold">Vehicle</TableHead>
                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  <span className="flex items-center">
                    Date
                    <SortIcon field="date" />
                  </span>
                </TableHead>
                <TableHead
                  className="font-semibold cursor-pointer"
                  onClick={() => handleSort("aiConfidence")}
                >
                  <span className="flex items-center">
                    AI Confidence
                    <SortIcon field="aiConfidence" />
                  </span>
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead
                  className="font-semibold text-right cursor-pointer"
                  onClick={() => handleSort("payout")}
                >
                  <span className="flex items-center justify-end">
                    Payout
                    <SortIcon field="payout" />
                  </span>
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedClaims.map((claim, index) => {
                const status = statusConfig[claim.status];
                const StatusIcon = status.icon;
                return (
                  <motion.tr
                    key={claim.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate("/dashboard")}
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-foreground">
                        {claim.claimNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">
                          {claim.vehiclePlate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {claim.vehicleModel}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(claim.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              claim.aiConfidence >= 90
                                ? "bg-emerald-500"
                                : claim.aiConfidence >= 70
                                  ? "bg-warning"
                                  : "bg-destructive"
                            )}
                            style={{ width: `${claim.aiConfidence}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            claim.aiConfidence >= 90
                              ? "text-emerald-500"
                              : claim.aiConfidence >= 70
                                ? "text-warning"
                                : "text-destructive"
                          )}
                        >
                          {claim.aiConfidence}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", status.className)}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {claim.payout > 0
                        ? `$${claim.payout.toLocaleString()}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/dashboard");
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Download className="w-4 h-4 mr-2" />
                            Download Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAndSortedClaims.length} of {mockClaims.length}{" "}
              claims
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
