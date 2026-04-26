import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  IndianRupee, 
  Calendar,
  MapPin,
  Fuel,
  User,
  FileText,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InsuranceDetailsResponse } from '@/services/apiService';

interface InsuranceDetailsPanelProps {
  insurance: InsuranceDetailsResponse;
  className?: string;
}

export function InsuranceDetailsPanel({ insurance, className }: InsuranceDetailsPanelProps) {
  const calculations = insurance.calculations;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="text-blue-500" size={20} />
          Insurance Details
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Policy information used for claim assessment
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Owner & Vehicle Info */}
        <div className="grid grid-cols-2 gap-3">
          {insurance.ownerName && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <User size={14} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="text-sm font-medium">{insurance.ownerName}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <MapPin size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">City</p>
              <p className="text-sm font-medium">
                {insurance.city}
                {calculations?.isNCRRegion && (
                  <span className="ml-1 text-xs text-amber-500">(NCR)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <IndianRupee size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Vehicle Price</p>
              <p className="text-sm font-medium">₹{insurance.vehiclePriceLakhs} Lakhs</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
            <Fuel size={14} className="text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fuel Type</p>
              <p className="text-sm font-medium">{insurance.fuelType}</p>
            </div>
          </div>

          {insurance.purchaseDate && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Calendar size={14} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Purchase Date</p>
                <p className="text-sm font-medium">
                  {new Date(insurance.purchaseDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {calculations && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <TrendingDown size={14} className="text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle Age</p>
                <p className="text-sm font-medium">{calculations.vehicleAgeYears.toFixed(1)} years</p>
              </div>
            </div>
          )}
        </div>

        {/* Policy Add-ons */}
        <div className="flex gap-2">
          <div className={cn(
            "flex-1 p-2 rounded-lg text-center text-sm",
            insurance.hasZeroDepreciation 
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-muted/30 text-muted-foreground"
          )}>
            <ShieldCheck size={16} className="mx-auto mb-1" />
            Zero-Dep {insurance.hasZeroDepreciation ? '✓' : '✗'}
          </div>
          
          <div className={cn(
            "flex-1 p-2 rounded-lg text-center text-sm",
            insurance.hasReturnToInvoice 
              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
              : "bg-muted/30 text-muted-foreground"
          )}>
            <FileText size={16} className="mx-auto mb-1" />
            RTI {insurance.hasReturnToInvoice ? '✓' : '✗'}
          </div>
        </div>


      </div>
    </motion.div>
  );
}

export default InsuranceDetailsPanel;
