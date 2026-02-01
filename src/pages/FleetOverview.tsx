import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Car,
  AlertTriangle,
  CheckCircle,
  Clock,
  Battery,
  Fuel,
  Navigation,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  status: "active" | "idle" | "maintenance" | "offline";
  location: string;
  lastUpdate: string;
  fuelLevel: number;
  batteryHealth: number;
}

const mockVehicles: Vehicle[] = [
  {
    id: "1",
    plate: "MH 01 AB 1234",
    model: "Tata Nexon EV",
    driver: "Rajesh Kumar",
    status: "active",
    location: "Mumbai, Andheri East",
    lastUpdate: "2 min ago",
    fuelLevel: 78,
    batteryHealth: 95,
  },
  {
    id: "2",
    plate: "DL 02 CD 5678",
    model: "Maruti Swift",
    driver: "Priya Singh",
    status: "idle",
    location: "Delhi, Connaught Place",
    lastUpdate: "15 min ago",
    fuelLevel: 45,
    batteryHealth: 88,
  },
  {
    id: "3",
    plate: "KA 03 EF 9012",
    model: "Hyundai Creta",
    driver: "Amit Sharma",
    status: "active",
    location: "Bangalore, Whitefield",
    lastUpdate: "5 min ago",
    fuelLevel: 92,
    batteryHealth: 91,
  },
  {
    id: "4",
    plate: "TN 04 GH 3456",
    model: "Honda City",
    driver: "Sunita Reddy",
    status: "maintenance",
    location: "Chennai, T. Nagar",
    lastUpdate: "1 hr ago",
    fuelLevel: 23,
    batteryHealth: 72,
  },
  {
    id: "5",
    plate: "GJ 05 IJ 7890",
    model: "Mahindra XUV700",
    driver: "Vikram Patel",
    status: "active",
    location: "Ahmedabad, SG Highway",
    lastUpdate: "8 min ago",
    fuelLevel: 67,
    batteryHealth: 94,
  },
  {
    id: "6",
    plate: "UP 06 KL 2345",
    model: "Kia Seltos",
    driver: "Neha Gupta",
    status: "offline",
    location: "Noida, Sector 62",
    lastUpdate: "3 hrs ago",
    fuelLevel: 12,
    batteryHealth: 65,
  },
];

const statusConfig = {
  active: {
    label: "Active",
    icon: Navigation,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  idle: {
    label: "Idle",
    icon: Clock,
    className: "bg-warning/10 text-warning",
  },
  maintenance: {
    label: "Maintenance",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
  offline: {
    label: "Offline",
    icon: Car,
    className: "bg-muted text-muted-foreground",
  },
};

export default function FleetOverview() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const activeCount = mockVehicles.filter((v) => v.status === "active").length;
  const idleCount = mockVehicles.filter((v) => v.status === "idle").length;
  const maintenanceCount = mockVehicles.filter((v) => v.status === "maintenance").length;

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-emerald-500" />
            </div>
            Fleet Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your vehicle fleet in real-time
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Car className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fleet</p>
                  <p className="text-2xl font-bold text-foreground">
                    {mockVehicles.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Idle</p>
                  <p className="text-2xl font-bold text-warning">{idleCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance</p>
                  <p className="text-2xl font-bold text-destructive">
                    {maintenanceCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  Live Vehicle Map
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)]">
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-navy-900 border border-border flex items-center justify-center relative overflow-hidden">
                  {/* Map Grid Pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                      backgroundImage: `
                        linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '40px 40px'
                    }} />
                  </div>
                  
                  {/* Vehicle Markers */}
                  <div className="absolute top-1/4 left-1/3 w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                  <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                  <div className="absolute top-2/3 left-1/4 w-4 h-4 rounded-full bg-warning animate-pulse shadow-lg shadow-warning/50" />
                  <div className="absolute top-1/3 right-1/4 w-4 h-4 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                  <div className="absolute bottom-1/4 right-1/3 w-4 h-4 rounded-full bg-destructive animate-pulse shadow-lg shadow-destructive/50" />
                  
                  {/* Center Text */}
                  <div className="relative z-10 text-center">
                    <MapPin className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Interactive Map View
                    </p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      Integrate with Leaflet or Google Maps
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Vehicle List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-[500px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-500" />
                  Active Vehicles
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-y-auto space-y-3">
                {mockVehicles.map((vehicle, index) => {
                  const status = statusConfig[vehicle.status];
                  const StatusIcon = status.icon;
                  const isSelected = selectedVehicle === vehicle.id;

                  return (
                    <motion.div
                      key={vehicle.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
                      className={cn(
                        "p-4 rounded-xl border cursor-pointer transition-all",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/5"
                          : "border-border hover:border-emerald-500/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {vehicle.plate}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", status.className)}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.model} • {vehicle.driver}
                          </p>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {vehicle.location}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-2 text-xs">
                            <Fuel className="w-3 h-3 text-muted-foreground" />
                            <span className={cn(
                              vehicle.fuelLevel > 50 ? "text-emerald-500" :
                              vehicle.fuelLevel > 25 ? "text-warning" : "text-destructive"
                            )}>
                              {vehicle.fuelLevel}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <Battery className="w-3 h-3 text-muted-foreground" />
                            <span className={cn(
                              vehicle.batteryHealth > 80 ? "text-emerald-500" :
                              vehicle.batteryHealth > 60 ? "text-warning" : "text-destructive"
                            )}>
                              {vehicle.batteryHealth}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {vehicle.lastUpdate}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
