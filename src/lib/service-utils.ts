import { db } from '@/lib/db';

export async function getServiceCommission(
  serviceId?: string | null,
  serviceName?: string | null,
  amount: number = 0,
  tx: any = db
): Promise<{ employeeCommission: number; isCommissionable: string; commissionPercent: number }> {
  if (amount <= 0) {
    return { employeeCommission: 0, isCommissionable: 'لا', commissionPercent: 0 };
  }

  let foundService: any = null;

  // 1. Search by serviceId in services_catalog
  if (serviceId) {
    try {
      foundService = await tx.services_catalog.findUnique({ where: { id: serviceId } });
    } catch (e) {
      foundService = null;
    }
    if (!foundService) {
      try {
        foundService = await tx.services.findUnique({ where: { id: serviceId } });
      } catch (e) {
        foundService = null;
      }
    }
  }

  // 2. Search by serviceName if not found by ID
  if (!foundService && serviceName) {
    const cleanName = serviceName.trim();

    // Try exact match on services_catalog
    try {
      foundService = await tx.services_catalog.findFirst({
        where: {
          service_name: { equals: cleanName, mode: 'insensitive' },
          is_active: true
        }
      });
    } catch (e) {
      foundService = null;
    }

    // If not found, try matching catalog items contained in serviceName (e.g. "أخرى: خدمات أونلاين" -> "خدمات أونلاين")
    if (!foundService) {
      try {
        const allCatalog = await tx.services_catalog.findMany({ where: { is_active: true } });
        for (const cat of allCatalog) {
          if (cat.service_name && cleanName.toLowerCase().includes(cat.service_name.toLowerCase())) {
            foundService = cat;
            break;
          }
        }
      } catch (e) {
        foundService = null;
      }
    }

    // Fallback: check legacy services table
    if (!foundService) {
      try {
        foundService = await tx.services.findFirst({
          where: {
            service_name: { equals: cleanName, mode: 'insensitive' },
            is_active: true
          }
        });
      } catch (e) {
        foundService = null;
      }
    }
  }

  if (foundService && (foundService.is_commissionable === true || String(foundService.is_commissionable) === 'true' || String(foundService.is_commissionable) === 'نعم')) {
    const pct = Number(foundService.commission_percent || 0);
    const comm = amount * (pct / 100);
    return {
      employeeCommission: comm,
      isCommissionable: 'نعم',
      commissionPercent: pct
    };
  }

  return { employeeCommission: 0, isCommissionable: 'لا', commissionPercent: 0 };
}
