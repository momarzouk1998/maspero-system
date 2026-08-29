import { db } from '@/lib/db';

const isUuid = (str: string | null | undefined): boolean =>
  typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function getServiceCommission(
  serviceId?: string | null,
  serviceName?: string | null,
  amount: number = 0,
  tx: any = db
): Promise<{ employeeCommission: number; isCommissionable: string; commissionPercent: number; matchedServiceId: string | null }> {
  if (amount <= 0) {
    return { employeeCommission: 0, isCommissionable: 'لا', commissionPercent: 0, matchedServiceId: isUuid(serviceId) ? serviceId! : null };
  }

  let foundService: any = null;

  // 1. Search by serviceId in services_catalog if it is a valid UUID
  if (isUuid(serviceId)) {
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

  const validServiceId = (foundService && isUuid(foundService.id))
    ? foundService.id
    : (isUuid(serviceId) ? serviceId! : null);

  if (foundService && (foundService.is_commissionable === true || String(foundService.is_commissionable) === 'true' || String(foundService.is_commissionable) === 'نعم')) {
    const pct = Number(foundService.commission_percent || 0);
    const comm = amount * (pct / 100);
    return {
      employeeCommission: comm,
      isCommissionable: 'نعم',
      commissionPercent: pct,
      matchedServiceId: validServiceId
    };
  }

  return {
    employeeCommission: 0,
    isCommissionable: 'لا',
    commissionPercent: 0,
    matchedServiceId: validServiceId
  };
}
