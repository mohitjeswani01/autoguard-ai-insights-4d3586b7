import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Car, 
  FileText, 
  IndianRupee, 
  Gavel,
  User,
  MapPin,
  Fuel,
  Calendar,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Insurance form data interface
export interface InsuranceFormData {
  ownerName: string;
  city: string;
  fuelType: string;
  vehiclePriceLakhs: number;
  purchaseDate: string;
  vehicleCondition: number;
  hasZeroDepreciation: boolean;
  hasReturnToInvoice: boolean;
  estimatedRepairBill: number;
}

interface InsuranceFormProps {
  className?: string;
  onFormChange?: (data: InsuranceFormData) => void;
  initialData?: Partial<InsuranceFormData>;
}

// IRDAI Depreciation Rate Calculator
const getDepreciationRate = (ageYears: number): number => {
  if (ageYears <= 0.5) return 0.05;
  if (ageYears <= 1) return 0.15;
  if (ageYears <= 2) return 0.20;
  if (ageYears <= 3) return 0.30;
  if (ageYears <= 4) return 0.40;
  return 0.50;
};

// City options
const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 
  'Hyderabad', 'Pune', 'Ahmedabad', 'Noida', 'Gurgaon',
  'Nagpur', 'Jaipur', 'Lucknow', 'Chandigarh', 'Other'
];

// Fuel type options
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

export function InsuranceForm({ className, onFormChange, initialData }: InsuranceFormProps) {
  // Form state
  const [formData, setFormData] = useState<InsuranceFormData>({
    ownerName: initialData?.ownerName || '',
    city: initialData?.city || 'Mumbai',
    fuelType: initialData?.fuelType || 'Petrol',
    vehiclePriceLakhs: initialData?.vehiclePriceLakhs || 10,
    purchaseDate: initialData?.purchaseDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vehicleCondition: initialData?.vehicleCondition || 0.9,
    hasZeroDepreciation: initialData?.hasZeroDepreciation || false,
    hasReturnToInvoice: initialData?.hasReturnToInvoice || false,
    estimatedRepairBill: initialData?.estimatedRepairBill || 50000,
  });

  // Calculated values
  const today = new Date();
  const purchaseDate = new Date(formData.purchaseDate);
  const ageYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const isNCR = ['delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'ghaziabad'].includes(formData.city.toLowerCase());
  
  const depRate = getDepreciationRate(ageYears);
  const idv = formData.vehiclePriceLakhs * (1 - depRate);
  const resale = Math.min(formData.vehiclePriceLakhs * 0.98, idv * 0.90 * formData.vehicleCondition);
  
  // Claim payout calculation
  const deductible = 1000;
  const insurerPayout = formData.hasZeroDepreciation 
    ? Math.max(0, formData.estimatedRepairBill - deductible)
    : Math.max(0, formData.estimatedRepairBill * 0.60 - deductible);
  const ownerLiability = formData.estimatedRepairBill - insurerPayout;

  // Notify parent of form changes
  useEffect(() => {
    onFormChange?.(formData);
  }, [formData, onFormChange]);

  // Update form field
  const updateField = <K extends keyof InsuranceFormData>(
    field: K, 
    value: InsuranceFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 bg-muted/30 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" size={20} />
          Insurance Details
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Provide vehicle &amp; policy details for accurate claim assessment
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Section 1: Owner & Vehicle Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText size={16} />
            Vehicle Information
          </h4>
          
          {/* Owner Name */}
          <div className="space-y-2">
            <Label htmlFor="ownerName" className="flex items-center gap-2">
              <User size={14} className="text-muted-foreground" />
              Owner Name
            </Label>
            <Input
              id="ownerName"
              placeholder="Enter owner name"
              value={formData.ownerName}
              onChange={(e) => updateField('ownerName', e.target.value)}
            />
          </div>

          {/* City & Fuel Type Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                City
              </Label>
              <Select
                value={formData.city}
                onValueChange={(value) => updateField('city', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelType" className="flex items-center gap-2">
                <Fuel size={14} className="text-muted-foreground" />
                Fuel Type
              </Label>
              <Select
                value={formData.fuelType}
                onValueChange={(value) => updateField('fuelType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((fuel) => (
                    <SelectItem key={fuel} value={fuel}>{fuel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Purchase Date */}
          <div className="space-y-2">
            <Label htmlFor="purchaseDate" className="flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground" />
              Purchase Date
            </Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => updateField('purchaseDate', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Vehicle Price */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <IndianRupee size={14} className="text-muted-foreground" />
              Vehicle Price: <span className="text-emerald-500 font-semibold">₹{formData.vehiclePriceLakhs} Lakhs</span>
            </Label>
            <Slider
              value={[formData.vehiclePriceLakhs]}
              onValueChange={([value]) => updateField('vehiclePriceLakhs', value)}
              min={2}
              max={100}
              step={0.5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹2L</span>
              <span>₹100L</span>
            </div>
          </div>

          {/* Vehicle Condition */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Gauge size={14} className="text-muted-foreground" />
              Condition: <span className="text-foreground font-semibold">{(formData.vehicleCondition * 100).toFixed(0)}%</span>
            </Label>
            <Slider
              value={[formData.vehicleCondition]}
              onValueChange={([value]) => updateField('vehicleCondition', value)}
              min={0.5}
              max={1.0}
              step={0.05}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Poor (50%)</span>
              <span>Excellent (100%)</span>
            </div>
          </div>

          {/* RC Status Badge */}
          <div className={cn(
            "p-3 rounded-xl flex items-start gap-3",
            ageYears > 15 ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
          )}>
            {ageYears > 15 ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
            <div>
              <p className="font-semibold text-sm">{ageYears > 15 ? 'RC EXPIRED' : 'RC VALID'}</p>
              <p className="text-xs opacity-90">
                {ageYears > 15 
                  ? 'Renewal + Green Tax required' 
                  : `Vehicle age: ${ageYears.toFixed(1)} years`}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Valuation */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Car size={16} />
            Asset Valuation
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current IDV</p>
              <p className="text-xl font-bold text-blue-500">₹{idv.toFixed(2)}L</p>
              <p className="text-xs text-muted-foreground">({(depRate * 100).toFixed(0)}% depreciation)</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Est. Resale</p>
              <p className="text-xl font-bold text-emerald-500">₹{resale.toFixed(2)}L</p>
              <p className="text-xs text-muted-foreground">{isNCR && '(NCR Region)'}</p>
            </div>
          </div>

          {/* Policy Add-ons */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Policy Add-ons</p>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500" />
                <span className="text-sm">Zero-Depreciation</span>
              </div>
              <Switch
                checked={formData.hasZeroDepreciation}
                onCheckedChange={(checked) => updateField('hasZeroDepreciation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-500" />
                <span className="text-sm">Return-to-Invoice</span>
              </div>
              <Switch
                checked={formData.hasReturnToInvoice}
                onCheckedChange={(checked) => updateField('hasReturnToInvoice', checked)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Claim Simulator */}
        <div className="space-y-4 p-4 bg-slate-900 rounded-xl text-white">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Gavel size={16} className="text-blue-400" />
            Claim Simulator
          </h4>
          <p className="text-xs text-slate-400">Estimate repair bill to see payout vs liability</p>
          
          <div className="space-y-2">
            <Slider
              value={[formData.estimatedRepairBill]}
              onValueChange={([value]) => updateField('estimatedRepairBill', value)}
              min={5000}
              max={500000}
              step={5000}
              className="py-2"
            />
            <p className="text-right font-mono text-blue-400">
              Repair Bill: ₹{formData.estimatedRepairBill.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="space-y-3 border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Insurer Pays:</span>
              <span className="text-lg font-bold text-emerald-400">
                ₹{insurerPayout.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Your Liability:</span>
              <span className="text-lg font-bold text-red-400">
                ₹{ownerLiability.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {!formData.hasZeroDepreciation && (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle size={12} />
              Standard policy: 40% parts depreciation applied
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default InsuranceForm;
