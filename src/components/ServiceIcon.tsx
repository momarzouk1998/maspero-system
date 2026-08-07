import React from 'react';
import { 
  Printer, Palette, Globe, Type, Monitor, Scan, GraduationCap, 
  Disc, Languages, Send, Smartphone, Cpu, HelpCircle, FileText, Wrench
} from 'lucide-react';

interface ServiceIconProps {
  name: string;
  className?: string;
}

export default function ServiceIcon({ name, className = "w-5 h-5" }: ServiceIconProps) {
  const n = (name || '').trim();

  if (n.includes('ألوان')) {
    return <Palette className={className} />;
  }
  if (n.includes('أسود')) {
    return <FileText className={className} />;
  }
  if (n.includes('أونلاين')) {
    return <Globe className={className} />;
  }
  if (n.includes('كتابة')) {
    return <Type className={className} />;
  }
  if (n.includes('حجز أجهزة') || n.includes('أجهزة')) {
    return <Monitor className={className} />;
  }
  if (n.includes('سكانر')) {
    return <Scan className={className} />;
  }
  if (n.includes('ابحاث') || n.includes('أبحاث')) {
    return <GraduationCap className={className} />;
  }
  if (n.includes('CD') || n.includes('سي دي') || n.includes('نسخ')) {
    return <Disc className={className} />;
  }
  if (n.includes('ترجمة')) {
    return <Languages className={className} />;
  }
  if (n.includes('فاكس')) {
    return <Send className={className} />;
  }
  if (n.includes('موبايل')) {
    return <Smartphone className={className} />;
  }
  if (n.includes('كمبيوتر')) {
    return <Cpu className={className} />;
  }

  // Fallback for any newly added service: current default Printer icon!
  return <Printer className={className} />;
}
